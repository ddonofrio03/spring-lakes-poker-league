-- =====================================================
-- SPRING LAKES POKER LEAGUE — permissions in TCG-DMD Overall
-- Project: utucjtnhdkewcgyvgvsj, schema: poker_league
--
-- Gives the website the same access it had in the old standalone project:
--   * anyone can READ league data
--   * anyone can submit / update an RSVP
--   * everything else is written only by the admin Edge Function
--     (service_role), after it checks the admin password
--
-- Idempotent: safe to run more than once. Only touches poker_league.
-- =====================================================

-- 1. Let the API roles into the schema
grant usage on schema poker_league to anon, authenticated, service_role;

grant select on all tables in schema poker_league to anon, authenticated;
grant insert, update on poker_league.rsvps to anon, authenticated;
grant all on all tables in schema poker_league to service_role;
grant usage, select on all sequences in schema poker_league to anon, authenticated, service_role;

-- Tables added later get the same defaults
alter default privileges in schema poker_league grant select on tables to anon, authenticated;
alter default privileges in schema poker_league grant all on tables to service_role;

-- 2. Row Level Security on every league table
alter table poker_league.players       enable row level security;
alter table poker_league.events        enable row level security;
alter table poker_league.results       enable row level security;
alter table poker_league.schedule      enable row level security;
alter table poker_league.rsvps         enable row level security;
alter table poker_league.announcements enable row level security;

-- 3. Public read
drop policy if exists "Public read players"       on poker_league.players;
drop policy if exists "Public read events"        on poker_league.events;
drop policy if exists "Public read results"       on poker_league.results;
drop policy if exists "Public read schedule"      on poker_league.schedule;
drop policy if exists "Public read rsvps"         on poker_league.rsvps;
drop policy if exists "Public read announcements" on poker_league.announcements;

create policy "Public read players"       on poker_league.players       for select using (true);
create policy "Public read events"        on poker_league.events        for select using (true);
create policy "Public read results"       on poker_league.results       for select using (true);
create policy "Public read schedule"      on poker_league.schedule      for select using (true);
create policy "Public read rsvps"         on poker_league.rsvps         for select using (true);
create policy "Public read announcements" on poker_league.announcements for select using (true);

-- 4. RSVPs from the website
drop policy if exists "Public insert rsvps" on poker_league.rsvps;
drop policy if exists "Public update rsvps" on poker_league.rsvps;
create policy "Public insert rsvps" on poker_league.rsvps for insert with check (true);
create policy "Public update rsvps" on poker_league.rsvps for update using (true) with check (true);

-- (service_role bypasses RLS, so the admin function needs no write policies.)

-- 5. Check: row counts, to compare with the old database
select 'players' as tbl, count(*) from poker_league.players
union all select 'events',        count(*) from poker_league.events
union all select 'results',       count(*) from poker_league.results
union all select 'schedule',      count(*) from poker_league.schedule
union all select 'rsvps',         count(*) from poker_league.rsvps
union all select 'announcements', count(*) from poker_league.announcements;
