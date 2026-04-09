import { useState, useEffect, useMemo, memo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MapPin, X, ArrowUpRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import WorldMap2D from '../components/WorldMap2D';

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  vibe: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
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
      const { data, error } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTrips(data || []);
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const globeDestinations = useMemo(() => {
    return trips.map(t => ({ name: t.destination }));
  }, [trips]);

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
      navigate(`/trip/${tripData.id}/itinerary`);
    } catch (err) {
      console.error(err);
      alert('Failed to create trip');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-y-auto no-scrollbar">
      {/* ── Hero Section ── */}
      <div className="relative w-full h-[380px] mb-12 boarding-pass flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <div className="absolute inset-0 z-0 opacity-15">
          <WorldMap2D destinations={globeDestinations} />
        </div>

        {/* Radar Grid Overlay */}
        <div className="absolute inset-0 z-[1] opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(116,209,255,0.6) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }} />

        <div className="relative z-10 text-center pointer-events-none">
          <div className="inline-block px-4 py-2 rounded-full mb-5" style={{ background: 'rgba(16,19,27,0.6)', border: '1px solid var(--border)' }}>
            <div className="dot-matrix" style={{ color: 'var(--amber)' }}>Global_Manifest_Online</div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-3 uppercase" style={{ fontFamily: 'Space Grotesk' }}>
            YOUR UNIVERSE
          </h1>
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>
            TOTAL TRIPS: {trips.length} &nbsp;·&nbsp; LEVEL: ADMIRAL
          </p>
        </div>

        <div className="absolute top-4 left-5 dot-matrix text-[7px] opacity-20">SCANNING_FREQUENCIES...</div>
        <div className="absolute bottom-4 right-5 dot-matrix text-[7px] opacity-20">ATLAS_NAV_v4.0.1</div>
      </div>

      {/* ── Section Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="dot-matrix mb-2" style={{ color: 'var(--cyan)' }}>ACTIVE_SYSTEM_PROCESS</div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Active Itineraries</h2>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-amber flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> INITIALIZE NEW TRIP
        </button>
      </div>

      {/* ── Trip Cards Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="boarding-pass h-52 animate-pulse" style={{ background: 'var(--bg3)' }} />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="boarding-pass flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6" style={{ border: '1px solid var(--border)' }}>
            <MapPin className="w-8 h-8 text-atlas-muted" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 uppercase" style={{ fontFamily: 'Space Grotesk' }}>Empty Manifest</h3>
          <p className="text-xs max-w-xs mx-auto mb-8" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>
            NO TRIP DATA FOUND IN LOCAL SECTOR. INITIALIZE FIRST JOURNEY TO PROCEED.
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-amber">CREATE_TRIP</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      {/* ── Create Trip Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(16,19,27,0.8)', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="boarding-pass w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center p-6" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Initialize Journey</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-atlas-muted hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTrip} className="p-6 space-y-5">
                <div>
                  <label className="dot-matrix block mb-2 text-[8px]">Trip_Identifier</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="E.G. PROJECT_NEON" className="input-retro w-full uppercase" />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="dot-matrix block mb-2 text-[8px]">Target_Sector</label>
                    <input required type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="DESTINATION..." className="input-retro w-full uppercase" />
                  </div>
                  <div>
                    <label className="dot-matrix block mb-2 text-[8px]">Vibe_Protocol</label>
                    <select value={vibe} onChange={e => setVibe(e.target.value)} className="input-retro w-full uppercase cursor-pointer" style={{ color: 'var(--text)' }}>
                      <option value="adventure">Adventure</option>
                      <option value="relaxed">Relaxed</option>
                      <option value="cultural">Cultural</option>
                      <option value="party">Party</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="dot-matrix block mb-2 text-[8px]">Start_Vector</label>
                    <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-retro w-full" />
                  </div>
                  <div>
                    <label className="dot-matrix block mb-2 text-[8px]">Return_Vector</label>
                    <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-retro w-full" />
                  </div>
                </div>

                <div className="perforation" />

                <div className="flex justify-end gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-[10px] uppercase font-bold hover:text-white px-4 transition-colors" style={{ color: 'var(--muted)', fontFamily: 'Space Grotesk', letterSpacing: '0.15em' }}>ABORT</button>
                  <button type="submit" disabled={creating} className="btn-amber px-8">
                    {creating ? "INITIALIZING..." : "EXECUTE"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Memoized Trip Card (Boarding Pass) ── */
const TripCard = memo(({ trip }: { trip: Trip }) => {
  return (
    <Link to={`/trip/${trip.id}/itinerary`} className="block group">
      <div
        className="boarding-pass p-5 transition-transform duration-200 group-hover:-translate-y-1"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="data-chip text-atlas-amber" style={{ background: 'rgba(240,160,80,0.08)' }}>{trip.vibe}</div>
          <ArrowUpRight className="w-4 h-4 text-atlas-muted2 group-hover:text-atlas-amber transition-colors duration-150" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-tight group-hover:text-atlas-amber2 transition-colors duration-150" style={{ fontFamily: 'Space Grotesk' }}>
          {trip.name}
        </h3>
        <div className="flex items-center gap-2 text-[10px] mb-6" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>
          <MapPin className="w-3 h-3" style={{ color: 'var(--cyan)' }} />
          <span>{trip.destination}</span>
        </div>

        <div className="perforation" />

        <div className="flex justify-between items-end mt-4">
          <div className="space-y-1">
            <div className="dot-matrix text-[7px] opacity-40">DEPARTURE</div>
            <div className="text-[10px] font-bold text-white" style={{ fontFamily: 'DM Mono' }}>
              {format(parseISO(trip.start_date), 'dd MMM yy').toUpperCase()}
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="dot-matrix text-[7px] opacity-40">IATA_CODE</div>
            <div className="text-white font-bold text-sm tracking-tighter" style={{ fontFamily: 'Space Grotesk' }}>
              {trip.destination.substring(0, 3).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});
