-- Function to securely fetch trip details for invite links
-- It uses SECURITY DEFINER to bypass RLS for this specific query

CREATE OR REPLACE FUNCTION get_trip_by_invite(invite_text TEXT)
RETURNS TABLE (id UUID, name TEXT, destination TEXT, start_date DATE, end_date DATE)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, name, destination, start_date, end_date
  FROM trips
  WHERE invite_code = invite_text;
$$;
