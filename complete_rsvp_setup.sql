-- =====================================================
-- SPRING LAKES POKER LEAGUE - RSVP SYSTEM SETUP
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/eitveufhzgfrkrjmsuhd/sql/new
-- =====================================================

-- Create RSVPs table
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  attending BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, email)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_email ON rsvps(email);
CREATE INDEX IF NOT EXISTS idx_rsvps_attending ON rsvps(attending);

-- Create function for auto timestamp updates
CREATE OR REPLACE FUNCTION update_rsvp_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS rsvp_timestamp_trigger ON rsvps;

-- Create trigger to auto-update timestamp
CREATE TRIGGER rsvp_timestamp_trigger
BEFORE UPDATE ON rsvps
FOR EACH ROW
EXECUTE FUNCTION update_rsvp_timestamp();

-- Create view for displaying attending RSVPs (for website)
CREATE OR REPLACE VIEW rsvp_attending AS
SELECT 
  r.id,
  r.event_id,
  r.name,
  r.email,
  r.notes,
  r.created_at,
  e.event_number,
  e.event_name,
  e.event_date,
  e.location
FROM rsvps r
JOIN events e ON r.event_id = e.id
WHERE r.attending = true
ORDER BY r.created_at ASC;

-- Create optional summary view for admin analytics
CREATE OR REPLACE VIEW rsvp_summary AS
SELECT 
  e.event_number,
  e.event_name,
  e.event_date,
  e.location,
  COUNT(CASE WHEN r.attending = true THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN r.attending = false THEN 1 END) as declined_count,
  COUNT(CASE WHEN r.attending IS NULL THEN 1 END) as maybe_count,
  COUNT(r.id) as total_rsvps
FROM events e
LEFT JOIN rsvps r ON e.id = r.event_id
WHERE e.season = 19
GROUP BY e.id, e.event_number, e.event_name, e.event_date, e.location
ORDER BY e.event_number DESC;
