-- Supabase Schema for Travel Planner
-- Includes: Trips, Trip Members, Itinerary Items, Expenses, Bookings, Messages, Polls

-- Create custom types for ENUMS
CREATE TYPE trip_vibe AS ENUM ('adventure', 'relaxed', 'cultural', 'party', 'family', 'luxury', 'budget');
CREATE TYPE expense_split_type AS ENUM ('equal', 'custom');
CREATE TYPE expense_category AS ENUM ('food', 'transport', 'stay', 'activity', 'other');
CREATE TYPE booking_type AS ENUM ('flight', 'hotel', 'tour', 'restaurant', 'other');

-- 1. TRIPS
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    vibe trip_vibe,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. TRIP MEMBERS
CREATE TABLE trip_members (
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'member', 'view_only')) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    PRIMARY KEY (trip_id, user_id)
);

-- 3. ITINERARY ITEMS
CREATE TABLE itinerary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    time_block TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    description TEXT,
    estimated_duration TEXT,
    estimated_cost TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. EXPENSES
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    split_type expense_split_type DEFAULT 'equal',
    category expense_category DEFAULT 'other',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 5. EXPENSE SPLITS (Custom splits)
CREATE TABLE expense_splits (
    expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_owed DECIMAL(12, 2) NOT NULL,
    PRIMARY KEY (expense_id, user_id)
);

-- 6. BOOKINGS
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    type booking_type NOT NULL,
    title TEXT NOT NULL,
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    confirmation_number TEXT,
    notes TEXT,
    cost DECIMAL(12, 2),
    booked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 7. MESSAGES (Group Chat)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 8. POLLS
CREATE TABLE polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    attached_itinerary_day INTEGER, 
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 9. POLL OPTIONS
CREATE TABLE poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL
);

-- 10. POLL VOTES
CREATE TABLE poll_votes (
    poll_option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    PRIMARY KEY (poll_option_id, user_id)
);

-- ======== ROW LEVEL SECURITY (RLS) POLICIES ========

-- Enable RLS on all tables
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is in a trip
CREATE OR REPLACE FUNCTION public.is_trip_member(trip_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_members.trip_id = $1
    AND trip_members.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to securely fetch trip details from an invite code
CREATE OR REPLACE FUNCTION public.get_trip_by_invite(invite_text TEXT)
RETURNS TABLE (id UUID, name TEXT, destination TEXT, start_date DATE, end_date DATE)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, name, destination, start_date, end_date
  FROM trips
  WHERE invite_code = invite_text;
$$;

-- Helper function to fetch trip members securely along with their emails from auth.users
CREATE OR REPLACE FUNCTION get_trip_members_with_email(target_trip_id UUID)
RETURNS TABLE (user_id UUID, role TEXT, nickname TEXT, email TEXT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT tm.user_id, tm.role, tm.nickname, au.email
  FROM trip_members tm
  JOIN auth.users au ON tm.user_id = au.id
  WHERE tm.trip_id = target_trip_id;
$$;

-- TRIPS policies
CREATE POLICY "Users can create trips" ON trips FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can view trips they are members of" ON trips FOR SELECT USING (public.is_trip_member(id) OR created_by = auth.uid());
CREATE POLICY "Users can update trips they are members of" ON trips FOR UPDATE USING (public.is_trip_member(id));
CREATE POLICY "Users can delete trips they own" ON trips FOR DELETE USING (created_by = auth.uid());

-- TRIP MEMBERS policies
CREATE POLICY "Users can view trip members for their trips" ON trip_members FOR SELECT USING (public.is_trip_member(trip_id));
CREATE POLICY "Users can join trips" ON trip_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ITINERARY ITEMS policies
CREATE POLICY "Users can view trip itineraries" ON itinerary_items FOR SELECT USING (public.is_trip_member(trip_id));
CREATE POLICY "Users can edit trip itineraries" ON itinerary_items FOR ALL USING (public.is_trip_member(trip_id));

-- EXPENSES & SPLITS policies
CREATE POLICY "Users can view trip expenses" ON expenses FOR SELECT USING (public.is_trip_member(trip_id));
CREATE POLICY "Users can edit trip expenses" ON expenses FOR ALL USING (public.is_trip_member(trip_id));
CREATE POLICY "Users can view expense splits" ON expense_splits FOR SELECT USING (
  EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_splits.expense_id AND public.is_trip_member(expenses.trip_id))
);
CREATE POLICY "Users can edit expense splits" ON expense_splits FOR ALL USING (
  EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_splits.expense_id AND public.is_trip_member(expenses.trip_id))
);

-- BOOKINGS policies
CREATE POLICY "Users can view bookings" ON bookings FOR SELECT USING (public.is_trip_member(trip_id));
CREATE POLICY "Users can edit bookings" ON bookings FOR ALL USING (public.is_trip_member(trip_id));

-- MESSAGES policies
CREATE POLICY "Users can view messages" ON messages FOR SELECT USING (public.is_trip_member(trip_id));
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (public.is_trip_member(trip_id) AND auth.uid() = user_id);

-- POLLS policies
CREATE POLICY "Users can view polls" ON polls FOR SELECT USING (public.is_trip_member(trip_id));
CREATE POLICY "Users can create polls" ON polls FOR INSERT WITH CHECK (public.is_trip_member(trip_id) AND auth.uid() = created_by);
CREATE POLICY "Users can view poll options" ON poll_options FOR SELECT USING (
  EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND public.is_trip_member(polls.trip_id))
);
CREATE POLICY "Users can create poll options" ON poll_options FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND public.is_trip_member(polls.trip_id))
);
CREATE POLICY "Users can view poll votes" ON poll_votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM poll_options JOIN polls ON polls.id = poll_options.poll_id WHERE poll_options.id = poll_votes.poll_option_id AND public.is_trip_member(polls.trip_id))
);
CREATE POLICY "Users can vote" ON poll_votes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM poll_options JOIN polls ON polls.id = poll_options.poll_id WHERE poll_options.id = poll_option_id AND public.is_trip_member(polls.trip_id))
);
