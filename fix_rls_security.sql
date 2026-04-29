-- =====================================================
-- SPRING LAKES POKER LEAGUE - RLS Security Fix
-- Idempotent: safe to run multiple times.
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eitveufhzgfrkrjmsuhd/sql/new
-- =====================================================

-- =====================================================
-- STEP 1: Enable RLS on every public table
-- =====================================================
ALTER TABLE players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Drop ALL existing policies on these tables so
-- we can re-create them cleanly. (Idempotent reset.)
-- =====================================================
DROP POLICY IF EXISTS "Public read players"          ON players;
DROP POLICY IF EXISTS "Public read events"           ON events;
DROP POLICY IF EXISTS "Public read results"          ON results;
DROP POLICY IF EXISTS "Public read schedule"         ON schedule;
DROP POLICY IF EXISTS "Public read rsvps"            ON rsvps;
DROP POLICY IF EXISTS "Public insert rsvps"          ON rsvps;
DROP POLICY IF EXISTS "Public update rsvps"          ON rsvps;
DROP POLICY IF EXISTS "Public read announcements"    ON announcements;

DROP POLICY IF EXISTS "Service write players"        ON players;
DROP POLICY IF EXISTS "Service write events"         ON events;
DROP POLICY IF EXISTS "Service write results"        ON results;
DROP POLICY IF EXISTS "Service write schedule"       ON schedule;
DROP POLICY IF EXISTS "Service write announcements"  ON announcements;

DROP POLICY IF EXISTS "Service role write players"   ON players;
DROP POLICY IF EXISTS "Service role update players"  ON players;
DROP POLICY IF EXISTS "Service role delete players"  ON players;
DROP POLICY IF EXISTS "Service role write events"    ON events;
DROP POLICY IF EXISTS "Service role update events"   ON events;
DROP POLICY IF EXISTS "Service role delete events"   ON events;
DROP POLICY IF EXISTS "Service role write results"   ON results;
DROP POLICY IF EXISTS "Service role update results"  ON results;
DROP POLICY IF EXISTS "Service role delete results"  ON results;
DROP POLICY IF EXISTS "Service role write schedule"  ON schedule;
DROP POLICY IF EXISTS "Service role update schedule" ON schedule;
DROP POLICY IF EXISTS "Service role delete schedule" ON schedule;

-- =====================================================
-- STEP 3: Public READ access (anon role)
-- =====================================================
CREATE POLICY "Public read players"       ON players       FOR SELECT USING (true);
CREATE POLICY "Public read events"        ON events        FOR SELECT USING (true);
CREATE POLICY "Public read results"       ON results       FOR SELECT USING (true);
CREATE POLICY "Public read schedule"      ON schedule      FOR SELECT USING (true);
CREATE POLICY "Public read rsvps"         ON rsvps         FOR SELECT USING (true);
CREATE POLICY "Public read announcements" ON announcements FOR SELECT USING (true);

-- =====================================================
-- STEP 4: RSVPs — let anon visitors submit and update
-- their own RSVP (matched by email at the app layer).
-- =====================================================
CREATE POLICY "Public insert rsvps" ON rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update rsvps" ON rsvps FOR UPDATE USING (true) WITH CHECK (true);

-- =====================================================
-- STEP 5: Admin tables — service_role only for writes.
-- The service_role bypasses RLS, but these explicit
-- policies make the intent clear and forward-compatible.
-- =====================================================
CREATE POLICY "Service role write players"   ON players  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role update players"  ON players  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role delete players"  ON players  FOR DELETE TO service_role USING (true);

CREATE POLICY "Service role write events"    ON events   FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role update events"   ON events   FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role delete events"   ON events   FOR DELETE TO service_role USING (true);

CREATE POLICY "Service role write results"   ON results  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role update results"  ON results  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role delete results"  ON results  FOR DELETE TO service_role USING (true);

CREATE POLICY "Service role write schedule"  ON schedule FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role update schedule" ON schedule FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role delete schedule" ON schedule FOR DELETE TO service_role USING (true);
