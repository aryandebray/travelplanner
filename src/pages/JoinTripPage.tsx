import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { MapPin, Loader2, Globe, Calendar, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function JoinTripPage() {
  const { code: inviteCode } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      // User is not logged in, force them to login first
      localStorage.setItem('atlas_redirect', `/join/${inviteCode}`);
      navigate('/auth');
      return;
    }

    fetchTripDetails();
  }, [inviteCode, user, authLoading, navigate]);

  const fetchTripDetails = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_trip_by_invite', { invite_text: inviteCode })
        .single();
        
      if (error) throw new Error(`Database Error: ${error.message}`);
      if (!data) throw new Error('Invalid or expired invite link.');
      
      const tripData = data as any;
      setTrip(tripData);
      
      if (user) {
        const { data: memberData } = await supabase
          .from('trip_members')
          .select('*')
          .eq('trip_id', tripData.id)
          .eq('user_id', user.id)
          .single();
          
        if (memberData) {
          navigate(`/trip/${tripData.id}/itinerary`);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      // Save this page URL so we can redirect back after auth
      localStorage.setItem('atlas_redirect', `/join/${inviteCode}`);
      navigate('/auth');
      return;
    }
    
    setJoining(true);
    try {
      const { error } = await supabase
        .from('trip_members')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          role: 'member',
          nickname: nickname.trim() || null
        });
        
      if (error) throw error;
      navigate(`/trip/${trip.id}/itinerary`);
    } catch (err: any) {
      setError(err.message || 'Failed to join trip');
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-atlas-bg relative">
        <div className="aurora-bg" />
        <Loader2 className="w-8 h-8 animate-spin text-accent-cyan relative z-10" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-atlas-bg relative p-4">
        <div className="aurora-bg" />
        <div className="glass-card p-8 max-w-md w-full text-center relative z-10 border border-white/10">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Trip Not Found</h2>
          <p className="text-slate-400 mb-6 text-sm">{error}</p>
          <button onClick={() => navigate('/')} className="btn-gradient">Go to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-atlas-bg relative p-4">
      <div className="aurora-bg" />
      <div className="aurora-blob-3" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 max-w-md w-full text-center border border-white/10 relative z-10"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-cyan/20 to-accent-violet/20 flex items-center justify-center mx-auto mb-6 border border-white/10">
          <Globe className="w-10 h-10 text-accent-cyan" />
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-2">You're Invited!</h2>
        <p className="text-slate-400 mb-6 text-sm">Join the group for an upcoming adventure.</p>
        
        <div className="bg-white/5 rounded-xl p-5 mb-6 text-left border border-white/5 space-y-3">
          <h3 className="font-bold text-lg text-white">{trip.name}</h3>
          <div className="flex items-center text-slate-300 text-sm gap-2">
            <MapPin className="w-4 h-4 text-accent-cyan shrink-0" /> {trip.destination}
          </div>
          <div className="flex items-center text-slate-400 text-sm gap-2">
            <Calendar className="w-4 h-4 text-accent-cyan shrink-0" />
            {format(parseISO(trip.start_date), 'MMM d')} — {format(parseISO(trip.end_date), 'MMM d, yyyy')}
          </div>
        </div>

        {user && (
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider text-left">Your Nickname (optional)</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="How should the group call you?"
                className="glass-input pl-10 text-sm"
              />
            </div>
          </div>
        )}

        <button 
          onClick={handleJoin}
          disabled={joining}
          className="btn-gradient w-full py-3.5 flex justify-center items-center text-sm"
        >
          {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : (user ? 'Join Trip' : 'Sign in to Join')}
        </button>
      </motion.div>
    </div>
  );
}
