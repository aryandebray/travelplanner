-- Function to fetch trip members securely along with their emails from auth.users
CREATE OR REPLACE FUNCTION get_trip_members_with_email(target_trip_id UUID)
RETURNS TABLE (user_id UUID, role TEXT, nickname TEXT, email TEXT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT tm.user_id, tm.role, tm.nickname, au.email
  FROM trip_members tm
  JOIN auth.users au ON tm.user_id = au.id
  WHERE tm.trip_id = target_trip_id;
$$;
