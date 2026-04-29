// Supabase Edge Function: admin
// Proxies write operations from the admin page so the service_role key
// stays server-side instead of exposed in the browser.
//
// Required environment secrets (set in Supabase dashboard):
//   ADMIN_PASSWORD          - password the admin page must send
//   PROJECT_URL             - https://eitveufhzgfrkrjmsuhd.supabase.co
//   SERVICE_ROLE_KEY        - Supabase service_role key (NEVER ship to browser)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { password?: string; action?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const adminPw = Deno.env.get("ADMIN_PASSWORD");
  if (!adminPw || body.password !== adminPw) {
    return json({ error: "Unauthorized" }, 401);
  }

  const url = Deno.env.get("PROJECT_URL");
  const key = Deno.env.get("SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Server misconfigured" }, 500);

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const action = body.action;
  const p = body.payload ?? {};

  try {
    switch (action) {
      case "saveEvent": {
        const { event, results } = p as {
          event: Record<string, unknown>;
          results: Record<string, unknown>[];
        };
        const { data: ev, error: evErr } = await sb
          .from("events")
          .upsert(event, { onConflict: "season,event_number", ignoreDuplicates: false })
          .select()
          .single();
        if (evErr) throw evErr;
        await sb.from("results").delete().eq("event_id", ev.id);
        const rows = results.map((r) => ({ ...r, event_id: ev.id }));
        const { error: resErr } = await sb.from("results").insert(rows);
        if (resErr) throw resErr;
        return json({ ok: true, eventId: ev.id });
      }

      case "deleteEvent": {
        const { id } = p as { id: string };
        const { error } = await sb.from("events").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "addPlayer": {
        const { name } = p as { name: string };
        const { error } = await sb.from("players").insert({ name, active: true });
        if (error) throw error;
        return json({ ok: true });
      }

      case "togglePlayer": {
        const { id, active } = p as { id: string; active: boolean };
        const { error } = await sb.from("players").update({ active }).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "saveAnnouncement": {
        const { id, body: text } = p as { id: string | null; body: string };
        if (id) {
          const { error } = await sb
            .from("announcements")
            .update({ body: text, updated_at: new Date().toISOString() })
            .eq("id", id);
          if (error) throw error;
          return json({ ok: true, id });
        } else {
          const { data, error } = await sb
            .from("announcements")
            .insert({ body: text })
            .select()
            .single();
          if (error) throw error;
          return json({ ok: true, id: data.id });
        }
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
