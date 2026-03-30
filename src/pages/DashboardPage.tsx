import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MapPin, Calendar, Users, X, Loader2, LogOut, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  vibe: string;
};

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vibe, setVibe] = useState('relaxed');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, [user]);

  const fetchTrips = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase.from('trips').select('*');
      if (error) throw error;
      setTrips(data || []);
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);

    try {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
          name,
          destination,
          start_date: startDate,
          end_date: endDate,
          vibe,
          created_by: user.id,
          invite_code: inviteCode
        })
        .select()
        .single();

      if (tripError) throw tripError;

      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripData.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      setIsModalOpen(false);
      setName('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      setVibe('relaxed');
      fetchTrips();
      navigate(`/trip/${tripData.id}/itinerary`);
    } catch (err) {
      console.error('Error creating trip:', err);
      alert('Failed to create trip');
    } finally {
      setCreating(false);
    }
  };

  const vibeGradients: Record<string, string> = {
    adventure: 'from-orange-500/20 to-red-500/20',
    relaxed: 'from-accent-cyan/20 to-accent-teal/20',
    cultural: 'from-amber-500/20 to-yellow-500/20',
    party: 'from-pink-500/20 to-purple-500/20',
    family: 'from-emerald-500/20 to-green-500/20',
    luxury: 'from-accent-violet/20 to-fuchsia-500/20',
    budget: 'from-blue-500/20 to-indigo-500/20',
  };

  return (
    <div className="min-h-screen relative">
      {/* Aurora Background */}
      <div className="aurora-bg" />
      <div className="aurora-blob-3" />

      {/* Top Navbar */}
      <nav className="sticky top-0 z-30 backdrop-blur-xl bg-atlas-bg/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shadow-lg shadow-accent-cyan/20">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Atlas</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-slate-500 hidden md:block">{user?.email}</span>
            <button 
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all font-medium"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-8 sm:mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Trips</h1>
            <p className="text-slate-400 text-sm sm:text-base">Select a trip to continue planning or create a new one.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-gradient flex items-center justify-center gap-2 group w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" /> New Trip
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card h-56 animate-pulse">
                <div className="h-24 bg-white/5 rounded-t-xl" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-white/5 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 glass-card">
            <div className="w-20 h-20 rounded-full bg-accent-cyan/10 flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-accent-cyan" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">No trips yet</h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">Start planning your next adventure by creating your first group trip.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-gradient"
            >
              Create your first trip
            </button>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
            }}
          >
            {trips.map((trip) => (
              <motion.div
                key={trip.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ 
                  y: -6, 
                  rotateX: 2,
                  rotateY: -2,
                  transition: { duration: 0.3 } 
                }}
                style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
              >
                <Link 
                  to={`/trip/${trip.id}/itinerary`}
                  className="block glass-card overflow-hidden glow-border h-full"
                >
                  <div className={`h-28 bg-gradient-to-br ${vibeGradients[trip.vibe] || vibeGradients.relaxed} flex items-end p-5 relative overflow-hidden`}>
                     <div className="absolute -right-4 -top-4 opacity-10">
                       <MapPin className="w-28 h-28 text-white" />
                     </div>
                     <h3 className="text-xl font-bold text-white relative z-10 drop-shadow-lg">{trip.name}</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-3 text-slate-300 text-sm">
                      <MapPin className="w-4 h-4 text-accent-cyan shrink-0" />
                      <span className="font-medium">{trip.destination}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-sm">
                      <Calendar className="w-4 h-4 text-accent-cyan shrink-0" />
                      <span>
                        {format(parseISO(trip.start_date), 'MMM d')} — {format(parseISO(trip.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-sm">
                      <Users className="w-4 h-4 text-accent-violet shrink-0" />
                      <span className="capitalize px-2 py-0.5 rounded-full bg-accent-violet/10 text-accent-violet text-xs font-medium">{trip.vibe}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Create Trip Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass-card w-full max-w-lg overflow-hidden border border-white/10"
              >
                 <div className="flex justify-between items-center p-6 border-b border-white/5">
                   <h2 className="text-xl font-bold text-white">Create New Trip</h2>
                   <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
                     <X className="w-5 h-5" />
                   </button>
                 </div>
                 
                 <form onSubmit={handleCreateTrip} className="p-6 space-y-5">
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Trip Name</label>
                     <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Summer in Europe" className="glass-input" />
                   </div>
                   
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Destination</label>
                     <div className="relative">
                       <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                       <input required type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Paris, France" className="glass-input pl-10" />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Start Date</label>
                       <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="glass-input" />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">End Date</label>
                       <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="glass-input" />
                     </div>
                   </div>

                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Trip Vibe</label>
                     <select value={vibe} onChange={e => setVibe(e.target.value)} className="glass-input appearance-none cursor-pointer">
                       <option value="adventure">Adventure</option>
                       <option value="relaxed">Relaxed</option>
                       <option value="cultural">Cultural</option>
                       <option value="party">Party</option>
                       <option value="family">Family</option>
                       <option value="luxury">Luxury</option>
                       <option value="budget">Budget</option>
                     </select>
                   </div>

                   <div className="pt-2 flex justify-end gap-3">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm">Cancel</button>
                     <button type="submit" disabled={creating} className="btn-gradient flex items-center gap-2 text-sm">
                       {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Trip"}
                     </button>
                   </div>
                 </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
