-- =====================================================
-- SPRING LAKES POKER LEAGUE - Supabase Setup Script
-- Run this in your Supabase SQL editor
-- =====================================================

-- Players table
create table if not exists players (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  active boolean default true,
  created_at timestamptz default now()
);

-- Events table
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  season integer not null default 19,
  event_number integer not null,
  event_name text not null,
  game_type text default 'NLHE',
  event_date date not null,
  location text default 'Dave''s Poker Room',
  player_count integer not null default 0,
  created_at timestamptz default now(),
  unique(season, event_number)
);

-- Results table (one row per player per event)
create table if not exists results (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  finish_position integer not null,
  points integer not null default 0,
  is_winner boolean default false,
  toc_bonus_chips integer default 0,
  payout numeric(8,2) default 0,
  created_at timestamptz default now(),
  unique(event_id, player_id)
);

-- Season schedule table
create table if not exists schedule (
  id uuid default gen_random_uuid() primary key,
  season integer not null default 19,
  event_number integer,
  event_date date not null,
  game_type text default 'NLHE',
  location text default 'Dave''s Poker Room',
  notes text,
  is_toc boolean default false
);

-- Enable Row Level Security (allow public reads)
alter table players enable row level security;
alter table events enable row level security;
alter table results enable row level security;
alter table schedule enable row level security;

-- Public read policies
create policy "Public read players" on players for select using (true);
create policy "Public read events" on events for select using (true);
create policy "Public read results" on results for select using (true);
create policy "Public read schedule" on schedule for select using (true);

-- Service role write policies (admin app uses service key)
create policy "Service write players" on players for all using (true);
create policy "Service write events" on events for all using (true);
create policy "Service write results" on results for all using (true);
create policy "Service write schedule" on schedule for all using (true);

-- =====================================================
-- Seed: Current Season 19 Players
-- =====================================================
insert into players (name) values
  ('Mike D'), ('Greg C'), ('Phil M'), ('Jeff H'), ('Mike R'),
  ('Chip G'), ('John W'), ('Shane J'), ('Rocky P'), ('Jean A'),
  ('Zack C'), ('Greg M'), ('Eddie B'), ('Dave D'), ('Eric L'), ('Mike V')
on conflict (name) do nothing;

-- =====================================================
-- Seed: Season 19 Schedule
-- =====================================================
insert into schedule (season, event_number, event_date, game_type, location) values
  (19, 1, '2026-01-17', 'NLHE', 'Dave''s Poker Room'),
  (19, 2, '2026-02-21', 'NLHE', 'Dave''s Poker Room'),
  (19, 3, '2026-03-21', 'NLHE', 'Dave''s Poker Room'),
  (19, 4, '2026-04-06', 'PLO', 'Dave''s Poker Room'),
  (19, 5, '2026-05-16', 'NLHE', 'Dave''s Poker Room'),
  (19, 6, '2026-06-20', 'NLHE', 'Dave''s Poker Room'),
  (19, 7, '2026-07-18', 'NLHE', 'Dave''s Poker Room'),
  (19, 8, '2026-08-15', 'NLHE', 'Dave''s Poker Room'),
  (19, 9, '2026-09-19', 'NLHE', 'Dave''s Poker Room'),
  (19, 10, '2026-10-17', 'NLHE', 'Dave''s Poker Room')
on conflict do nothing;

insert into schedule (season, event_date, game_type, location, is_toc, notes) values
  (19, '2026-11-21', 'NLHE', 'Dave''s Poker Room', true, 'Tournament of Champions')
on conflict do nothing;
