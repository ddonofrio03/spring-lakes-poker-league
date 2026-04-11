// Supabase client factory — used by all public pages
function getSupabase() {
  return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Nav mobile toggle
function toggleNav() {
  document.querySelector('.site-nav')?.classList.toggle('open');
}
