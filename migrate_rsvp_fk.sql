-- =====================================================
-- MIGRATION: Allow RSVPs to reference schedule table IDs
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/eitveufhzgfrkrjmsuhd/sql/new
-- =====================================================

-- Drop the foreign key constraint that ties rsvps to events table.
-- RSVPs now reference the schedule table so future events can accept RSVPs
-- before results are entered.
ALTER TABLE rsvps DROP CONSTRAINT IF EXISTS rsvps_event_id_fkey;
