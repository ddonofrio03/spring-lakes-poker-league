// Shared "TCG-DMD Overall" project; poker tables live in the poker_league schema.
const SUPABASE_URL = 'https://utucjtnhdkewcgyvgvsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4OrSCnTMRaXai768QwAqeQ_U7w7CPuT';
const DB_SCHEMA = 'poker_league';
const SEASON = 19;

// NOTE: the admin password is deliberately NOT here. This file is served
// publicly at /admin/config.js, so anything in it is readable by anyone.
// Login is verified server-side by the `admin` Edge Function against its
// ADMIN_PASSWORD secret. The anon key above is safe to expose — writes are
// blocked by RLS.
