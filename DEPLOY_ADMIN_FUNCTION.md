# Deploying the Admin Edge Function

The admin page saves results, players and announcements through the
`admin` Edge Function, so the `service_role` key stays server-side
instead of being exposed in the browser.

The league lives in the shared **TCG-DMD Overall** project
(`utucjtnhdkewcgyvgvsj`), in the **`poker_league`** schema. The function is
named `admin` and checks the `ADMIN_PASSWORD` secret. (It is already deployed
there; redeploy only after changing `supabase/functions/admin/index.ts`.)

## Prerequisites

- Run `poker_league_permissions.sql` in the TCG-DMD Overall SQL editor.
- In the dashboard: **Project Settings → Data API → Exposed schemas**, add
  `poker_league` and save.
- Install the Supabase CLI: `brew install supabase/tap/supabase`

## 1. Set the admin password secret

Dashboard → **Edge Functions → Secrets** → add:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | the password you type on the admin page |

> ⚠️ This repository is **public**. Never put the admin password or the
> service_role key in any file here.

Nothing else to set: Supabase gives every Edge Function `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` automatically.

## 2. Deploy the function

From the repo root:

```
supabase login
supabase functions deploy admin --project-ref utucjtnhdkewcgyvgvsj --no-verify-jwt
```

`--no-verify-jwt` is required because the admin page authenticates with the
custom password rather than a Supabase Auth JWT.

## 3. Test

1. Visit `https://springlakespoker.com/admin/`
2. Log in with the admin password
3. Try adding a player, recording an event, or updating the announcement
4. If it fails, open the browser console and check the error
   (or dashboard → Edge Functions → admin → Logs)

## How it works

```
Browser (admin page)              Edge Function                Supabase DB
─────────────────────             ───────────────              ───────────
[admin types password]
       │
       │  POST /functions/v1/admin
       │  { password, action, payload }
       ▼
                                 checks password against
                                 ADMIN_PASSWORD
                                       │
                                       │ service_role, poker_league schema
                                       ▼
                                                              writes succeed
                                                              (bypasses RLS)
```

Public reads on the website go directly through the anon key with the
`poker_league` schema — they don't need the function.
