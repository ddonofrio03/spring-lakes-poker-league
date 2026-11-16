-- =====================================================
-- Season 20 (2027) schedule — 3rd Saturday of each month
-- Same format as Season 19: Event 4 (April) is PLO, TOC in November.
--
-- Run once in the TCG-DMD Overall SQL editor (tables are in poker_league). Safe to re-run: it skips any
-- Season 20 row that already exists for that date.
--
-- NOT PUBLISHED: every public page (home, schedule, rankings, TOC, active
-- event) only reads season = 19, so these rows stay hidden until the site
-- is switched over to Season 20.
-- =====================================================
insert into poker_league.schedule (season, event_number, event_date, game_type, location, is_toc, notes)
select v.season, v.event_number, v.event_date::date, v.game_type, v.location, v.is_toc, v.notes
from (values
  (20, 1,    '2027-01-16', 'NLHE', 'Dave''s Poker Room', false, null),
  (20, 2,    '2027-02-20', 'NLHE', 'Dave''s Poker Room', false, null),
  (20, 3,    '2027-03-20', 'NLHE', 'Dave''s Poker Room', false, null),
  (20, 4,    '2027-04-17', 'PLO',  'Dave''s Poker Room', false, null),
  (20, 5,    '2027-05-15', 'NLHE', 'Dave''s Poker Room', false, null),
  (20, 6,    '2027-06-19', 'NLHE', 'Dave''s Poker Room', false, null),
  (20, 7,    '2027-07-17', 'NLHE', 'Dave''s Poker Room', false, null),
  (20, 8,    '2027-08-21', 'NLHE', 'Dave''s Poker Room', false, null),
  (20, 9,    '2027-09-18', 'NLHE', 'Dave''s Poker Room', false, null),
  (20, 10,   '2027-10-16', 'NLHE', 'Dave''s Poker Room', false, null),
  (20, null, '2027-11-20', 'NLHE', 'Dave''s Poker Room', true,  'Tournament of Champions')
) as v(season, event_number, event_date, game_type, location, is_toc, notes)
where not exists (
  select 1 from poker_league.schedule s where s.season = 20 and s.event_date = v.event_date::date
);

-- Check it:
-- select event_number, event_date, to_char(event_date, 'Dy') as day, game_type, is_toc, notes
-- from poker_league.schedule where season = 20 order by event_date;
