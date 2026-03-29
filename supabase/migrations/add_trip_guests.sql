-- Trip Guests table for nickname-only members who don't have accounts
CREATE TABLE IF NOT EXISTS trip_guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    nickname TEXT NOT NULL,
    added_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE trip_guests ENABLE ROW LEVEL SECURITY;

-- Allow trip members to view guests
CREATE POLICY "Trip members can view guests" ON trip_guests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_guests.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Allow trip members to add guests
CREATE POLICY "Trip members can add guests" ON trip_guests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_guests.trip_id
      AND trip_members.user_id = auth.uid()
    )
    AND added_by = auth.uid()
  );

-- Allow trip members to delete guests
CREATE POLICY "Trip members can remove guests" ON trip_guests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_guests.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Allow trip members to update guest nicknames
CREATE POLICY "Trip members can update guests" ON trip_guests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_guests.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Add paid_by_guest_id to expenses so guests can pay for expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_by_guest_id UUID REFERENCES trip_guests(id) ON DELETE SET NULL;
