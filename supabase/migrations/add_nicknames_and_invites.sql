-- Add nickname column to trip_members
ALTER TABLE trip_members ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Create trip_invites table for email-based invitations
CREATE TABLE IF NOT EXISTS trip_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  invited_email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on trip_invites
ALTER TABLE trip_invites ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read invites for their email
CREATE POLICY "Users can view their own invites" ON trip_invites
  FOR SELECT USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR invited_by = auth.uid()
  );

-- Allow trip members to create invites
CREATE POLICY "Trip members can create invites" ON trip_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_invites.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );
