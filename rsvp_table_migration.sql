-- =====================================================
-- SPRING LAKES POKER LEAGUE - RSVP Table
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Create RSVPs table
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  attending BOOLEAN, -- true = attending, false = not attending, NULL = maybe
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one RSVP per email per event
  UNIQUE(event_id, email)
);

-- Create indexes for faster queries
CREATE INDEX idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX idx_rsvps_email ON rsvps(email);
CREATE INDEX idx_rsvps_attending ON rsvps(attending);

-- Optional: If you want to automatically track when RSVPs are updated
CREATE OR REPLACE FUNCTION update_rsvp_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rsvp_timestamp_trigger
BEFORE UPDATE ON rsvps
FOR EACH ROW
EXECUTE FUNCTION update_rsvp_timestamp();

-- Optional: Create a view to see RSVP summary by event
CREATE OR REPLACE VIEW rsvp_summary AS
SELECT 
  e.event_number,
  e.event_name,
  e.event_date,
  COUNT(CASE WHEN r.attending = true THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN r.attending = false THEN 1 END) as declined_count,
  COUNT(CASE WHEN r.attending IS NULL THEN 1 END) as maybe_count,
  COUNT(r.id) as total_rsvps
FROM events e
LEFT JOIN rsvps r ON e.id = r.event_id
WHERE e.season = 19
GROUP BY e.id, e.event_number, e.event_name, e.event_date
ORDER BY e.event_number DESC;
