import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type TripMember = {
  user_id: string;
  role: string;
  nickname: string | null;
  email?: string;
};

type TripMembersContextType = {
  members: TripMember[];
  loading: boolean;
  getMemberName: (userId: string) => string;
  updateNickname: (userId: string, nickname: string) => Promise<void>;
  refetchMembers: () => Promise<void>;
};

const TripMembersContext = createContext<TripMembersContextType>({
  members: [],
  loading: true,
  getMemberName: () => '',
  updateNickname: async () => {},
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
      const { data, error } = await supabase
        .from('trip_members')
        .select('user_id, role, nickname')
        .eq('trip_id', tripId);

      if (error) throw error;
      setMembers(data || []);
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
    if (userId === user?.id) {
      const me = members.find(m => m.user_id === userId);
      return me?.nickname || 'You';
    }
    const member = members.find(m => m.user_id === userId);
    return member?.nickname || `User ${userId.substring(0, 4)}`;
  };

  const updateNickname = async (userId: string, nickname: string) => {
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ nickname })
        .eq('trip_id', tripId)
        .eq('user_id', userId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, nickname } : m));
    } catch (err) {
      console.error('Failed to update nickname', err);
      throw err;
    }
  };

  return (
    <TripMembersContext.Provider value={{ members, loading, getMemberName, updateNickname, refetchMembers: fetchMembers }}>
      {children}
    </TripMembersContext.Provider>
  );
}
