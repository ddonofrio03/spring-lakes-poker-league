# Deploying the Admin Edge Function

This locks down admin writes so the `service_role` key stays server-side
instead of being exposed in the browser.

## Prerequisites

- Run `fix_rls_security.sql` first (you've already done this).
- Install the Supabase CLI:
  ```
  brew install supabase/tap/supabase
  ```

## 1. Log in and link the project

From the repo root:

```
supabase login
supabase link --project-ref eitveufhzgfrkrjmsuhd
```

## 2. Set the secrets the function needs

Get your **service_role key** from:
Supabase dashboard → Project Settings → API → `service_role` (secret).

> ⚠️ Never paste the service_role key into any file in the GitHub repo.

```
supabase secrets set ADMIN_PASSWORD='SpringLakes2008$$'
supabase secrets set PROJECT_URL='https://eitveufhzgfrkrjmsuhd.supabase.co'
supabase secrets set SERVICE_ROLE_KEY='<paste service_role key here>'
```

You can also set these in the dashboard:
**Edge Functions → admin → Secrets**.

## 3. Deploy the function

```
supabase functions deploy admin --no-verify-jwt
```

`--no-verify-jwt` is required because the admin page authenticates with the
custom password rather than a Supabase Auth JWT.

## 4. Test

1. Visit `https://springlakespoker.com/admin/`
2. Log in with the admin password
3. Try adding a player, recording an event, or updating the announcement
4. If it fails, open the browser console and check the error
   (or Supabase dashboard → Edge Functions → admin → Logs)

## 5. Recommended cleanup

After confirming everything works:

- **Change the admin password** — the old one was in the public repo.
  Pick a new one and update it in three places:
  1. `supabase secrets set ADMIN_PASSWORD='<new password>'`
  2. Remove `ADMIN_PASSWORD` from `admin/config.js` entirely (no longer used)
  3. Commit and push the `config.js` change
- **Rotate your Supabase anon key** if you want extra hygiene
  (Project Settings → API → Reset anon key).
  The anon key is supposed to be public, but rotating it invalidates any
  cached copies. Update `config.js` with the new key after rotation.

## How it works (recap)

```
Browser (admin page)              Edge Function                Supabase DB
─────────────────────             ───────────────              ───────────
[admin types password]
       │
       │  POST /functions/v1/admin
       │  { password, action, payload }
       ▼
                                 verifies password
                                 against ADMIN_PASSWORD
                                 secret
                                       │
                                       │ uses SERVICE_ROLE_KEY
                                       ▼
                                                              writes succeed
                                                              (bypasses RLS)
```

Public reads on the website still go directly through the anon key —
they don't need the function.
