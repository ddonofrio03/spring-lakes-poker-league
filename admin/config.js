const SUPABASE_URL = 'https://eitveufhzgfrkrjmsuhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdHZldWZoemdmcmtyam1zdWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MTY3OTAsImV4cCI6MjA5MTQ5Mjc5MH0.j-LeX88aT3CL3ShCZ7JemisLoBdv7ti1AgH7wwBG2P4';
const SEASON = 19;

// NOTE: the admin password is deliberately NOT here. This file is served
// publicly at /admin/config.js, so anything in it is readable by anyone.
// Login is verified server-side by the `admin` Edge Function against its
// ADMIN_PASSWORD secret. The anon key above is safe to expose — writes are
// blocked by RLS.
