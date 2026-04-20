import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type TripMember = {
  user_id: string;
  role: string;
  nickname: string | null;
  email?: string;
  is_guest?: boolean;
};

type TripMembersContextType = {
  members: TripMember[];
  loading: boolean;
  getMemberName: (userId: string) => string;
  updateNickname: (userId: string, nickname: string) => Promise<void>;
  addGuestMember: (nickname: string) => Promise<void>;
  removeGuestMember: (guestId: string) => Promise<void>;
  refetchMembers: () => Promise<void>;
};

const TripMembersContext = createContext<TripMembersContextType>({
  members: [],
  loading: true,
  getMemberName: () => '',
  updateNickname: async () => {},
  addGuestMember: async () => {},
  removeGuestMember: async () => {},
  refetchMembers: async () => {},
});

export const useTripMembers = () => useContext(TripMembersContext);

export function TripMembersProvider({ tripId, children }: { tripId: string; children: ReactNode }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    if (!tripId) return;
    try {
      // Fetch both real members and guests in parallel
      const [membersRes, guestsRes] = await Promise.all([
        supabase
          .rpc('get_trip_members_with_email', { target_trip_id: tripId }),
        supabase
          .from('trip_guests')
          .select('id, nickname, created_at')
          .eq('trip_id', tripId)
      ]);

      if (membersRes.error) throw membersRes.error;

      const realMembers: TripMember[] = (membersRes.data || []).map(m => ({
        ...m,
        is_guest: false,
      }));

      // Map guests into the same TripMember shape using "guest:<id>" as user_id
      const guestMembers: TripMember[] = (guestsRes.data || []).map(g => ({
        user_id: `guest:${g.id}`,
        role: 'guest',
        nickname: g.nickname,
        is_guest: true,
      }));

      setMembers([...realMembers, ...guestMembers]);
    } catch (err) {
      console.error('Failed to fetch members', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [tripId]);

  const getMemberName = (userId: string): string => {
    // If it's a guest, return the nickname directly
    if (userId.startsWith('guest:')) {
      const member = members.find(m => m.user_id === userId);
      return member?.nickname || 'Guest';
    }
    
    const member = members.find(m => m.user_id === userId);
    const emailPrefix = member?.email?.split('@')[0];
    
    if (userId === user?.id) {
      return member?.nickname || emailPrefix || 'You';
    }
    return member?.nickname || emailPrefix || `User ${userId.substring(0, 4)}`;
  };

  const updateNickname = async (userId: string, nickname: string) => {
    try {
      if (userId.startsWith('guest:')) {
        // Update guest nickname
        const guestId = userId.replace('guest:', '');
        const { error } = await supabase
          .from('trip_guests')
          .update({ nickname })
          .eq('id', guestId);
        if (error) throw error;
      } else {
        // Update real member nickname
        const { error } = await supabase
          .from('trip_members')
          .update({ nickname })
          .eq('trip_id', tripId)
          .eq('user_id', userId);
        if (error) throw error;
      }
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, nickname } : m));
    } catch (err) {
      console.error('Failed to update nickname', err);
      throw err;
    }
  };

  const addGuestMember = async (nickname: string) => {
    if (!tripId || !user) return;
    try {
      const { data, error } = await supabase
        .from('trip_guests')
        .insert({
          trip_id: tripId,
          nickname: nickname.trim(),
          added_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      // Add to local state immediately
      setMembers(prev => [...prev, {
        user_id: `guest:${data.id}`,
        role: 'guest',
        nickname: data.nickname,
        is_guest: true,
      }]);
    } catch (err) {
      console.error('Failed to add guest member', err);
      throw err;
    }
  };

  const removeGuestMember = async (guestUserId: string) => {
    if (!guestUserId.startsWith('guest:')) return;
    const guestId = guestUserId.replace('guest:', '');
    try {
      const { error } = await supabase
        .from('trip_guests')
        .delete()
        .eq('id', guestId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.user_id !== guestUserId));
    } catch (err) {
      console.error('Failed to remove guest', err);
      throw err;
    }
  };

  return (
    <TripMembersContext.Provider value={{ members, loading, getMemberName, updateNickname, addGuestMember, removeGuestMember, refetchMembers: fetchMembers }}>
      {children}
    </TripMembersContext.Provider>
  );
}
