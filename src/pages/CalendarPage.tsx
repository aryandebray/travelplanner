import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Calendar as CalendarIcon, Clock, X, Type, Plane, Bed, Utensils, Compass } from 'lucide-react';
import { format, parseISO, isSameDay, differenceInDays, addDays, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

type Booking = {
  id: string;
  type: 'flight' | 'hotel' | 'tour' | 'restaurant' | 'other';
  title: string;
  start_datetime: string;
  end_datetime: string;
  confirmation_number: string;
  notes: string;
  cost: number;
  booked_by: string;
};

const BOOKING_ICONS: Record<string, any> = {
  flight: Plane,
  hotel: Bed,
  tour: Compass,
  restaurant: Utensils,
  other: CalendarIcon
};

export default function CalendarPage() {
  const { tripId } = useParams();
  const { user } = useAuth();
  
  const [trip, setTrip] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewState, setViewState] = useState<'month' | 'list'>('month');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailPaste, setEmailPaste] = useState('');
  const [parsing, setParsing] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const [bType, setBType] = useState('flight');
  const [bTitle, setBTitle] = useState('');
  const [bStart, setBStart] = useState('');
  const [bEnd, setBEnd] = useState('');
  const [bConf, setBConf] = useState('');
  const [bNotes] = useState('');
  const [bCost, setBCost] = useState('');

  useEffect(() => { fetchData(); }, [tripId]);

  const fetchData = async () => {
    if (!tripId) return;
    try {
      const [tripRes, bookRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('bookings').select('*').eq('trip_id', tripId).order('start_datetime', { ascending: true })
      ]);
      if (tripRes.data) { setTrip(tripRes.data); setCurrentMonth(startOfMonth(parseISO(tripRes.data.start_date))); }
      if (bookRes.data) setBookings(bookRes.data as Booking[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const parseEmail = async () => {
    if (!emailPaste.trim()) return;
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-booking', { body: { email: emailPaste } });
      if (error) throw error;
      if (data) {
        if (data.type) setBType(data.type);
        if (data.title) setBTitle(data.title);
        if (data.start_datetime) setBStart(data.start_datetime);
        if (data.end_datetime) setBEnd(data.end_datetime);
        if (data.confirmation_number) setBConf(data.confirmation_number);
        if (data.cost) setBCost(data.cost.toString());
        setEmailPaste('');
      }
    } catch (err) { console.error(err); alert('Failed to parse email.'); }
    finally { setParsing(false); }
  };

  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId || !user) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.from('bookings').insert({
        trip_id: tripId, type: bType, title: bTitle, start_datetime: bStart || null, end_datetime: bEnd || null,
        confirmation_number: bConf, notes: bNotes, cost: bCost ? parseFloat(bCost) : null, booked_by: user.id
      }).select().single();
      if (error) throw error;
      setBookings(prev => [...prev, data as Booking].sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()));
      setIsModalOpen(false);
    } catch (err) { console.error(err); alert('Failed to add booking'); }
    finally { setAdding(false); }
  };

  if (loading) return <div className="p-8 flex justify-center h-full items-center"><Loader2 className="w-8 h-8 animate-spin text-atlas-amber" /></div>;

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInterval = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const blanks = Array.from({ length: startDay }).map((_, i) => <div key={`blank-${i}`} className="p-2 h-28" style={{ borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'rgba(24,27,35,0.3)' }} />);

    return (
      <div className="boarding-pass overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-atlas-border">
          <h2 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]" style={{ fontFamily: 'Space Grotesk' }}>{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex gap-2">
            <button onClick={() => setCurrentMonth(addDays(monthStart, -1))} className="p-2 text-atlas-muted hover:text-white transition-all">&larr;</button>
            <button onClick={() => setCurrentMonth(addDays(monthEnd, 1))} className="p-2 text-atlas-muted hover:text-white transition-all">&rarr;</button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-atlas-border bg-atlas-bg2/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-2.5 text-center dot-matrix text-[7px] text-atlas-muted uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {blanks}
          {daysInterval.map(day => {
            const dayBookings = bookings.filter(b => b.start_datetime && isSameDay(parseISO(b.start_datetime), day));
            const isTripDay = trip && isWithinInterval(day, { start: parseISO(trip.start_date), end: parseISO(trip.end_date) });
            return (
              <div key={day.toISOString()} className={`p-2 border-b border-r border-atlas-border h-28 overflow-y-auto ${isTripDay ? 'bg-atlas-amber/[0.03]' : ''}`}>
                <div className={`dot-matrix text-[8px] mb-1.5 ${isTripDay ? 'text-atlas-amber' : 'text-atlas-muted'}`}>{format(day, 'd')}</div>
                <div className="space-y-1">
                  {dayBookings.map(b => (
                    <div key={b.id} className="text-[7px] px-1.5 py-0.5 border border-atlas-cyan/30 text-atlas-cyan uppercase font-bold truncate">
                      {b.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderList = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bookings.map(b => {
          const Icon = BOOKING_ICONS[b.type] || CalendarIcon;
          return (
            <motion.div key={b.id} className="boarding-pass p-5 group flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <div className="dot-matrix text-atlas-amber text-[8px] mb-1">BOOKING_TYPE</div>
                    <div className="text-[10px] font-black text-white uppercase font-mono">{b.type}</div>
                 </div>
                 <div className="w-10 h-10 border border-atlas-border rounded-xl flex items-center justify-center text-atlas-muted group-hover:text-atlas-amber transition-colors">
                    <Icon className="w-5 h-5" />
                 </div>
              </div>

              <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-2 group-hover:text-atlas-amber transition-colors">
                {b.title}
              </h4>

              <div className="flex items-center gap-2 mb-6">
                 <Clock className="w-3.5 h-3.5 text-atlas-cyan" />
                 <span className="text-[10px] font-bold text-atlas-muted uppercase font-mono">
                   {b.start_datetime ? format(parseISO(b.start_datetime), 'MMM d, HH:mm') : 'SCHEDULE_PENDING'}
                 </span>
              </div>

              <div className="perforation mb-4" />

              <div className="flex justify-between items-end">
                 <div>
                    <div className="dot-matrix text-[7px] opacity-40">confirmation</div>
                    <div className="text-[10px] text-atlas-cyan font-bold font-mono tracking-widest">{b.confirmation_number || 'NULL_KEY'}</div>
                 </div>
                 <div className="text-right">
                    <div className="dot-matrix text-[7px] opacity-40">cost</div>
                    <div className="text-white font-black text-xs font-mono">{b.cost ? `$${b.cost.toFixed(2)}` : 'FREE_VAL'}</div>
                 </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
           <div className="dot-matrix text-atlas-cyan mb-2">CALENDAR_MANIFEST_ACTIVE</div>
           <h1 className="text-4xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Temporal_Log</h1>
           {trip && (
             <div className="flex items-center gap-3 mt-2">
               <div className="text-[10px] font-bold text-atlas-amber uppercase tracking-widest font-mono">
                 DEPARTURE IN {differenceInDays(parseISO(trip.start_date), new Date())} DAYS
               </div>
               <div className="w-1 h-1 bg-atlas-border rounded-full" />
               <div className="text-[10px] font-bold text-atlas-muted uppercase tracking-widest font-mono">
                 {bookings.length} RESERVATIONS_CONFIRMED
               </div>
             </div>
           )}
        </div>
        
        <div className="flex items-center gap-3">
           <div className="p-1 flex text-[9px] font-bold uppercase tracking-widest rounded-lg" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
             <button onClick={() => setViewState('month')} className={`px-4 py-2 transition-all ${viewState === 'month' ? 'text-atlas-amber' : 'text-atlas-muted hover:text-white'}`}>GRID_CORE</button>
             <button onClick={() => setViewState('list')} className={`px-4 py-2 transition-all ${viewState === 'list' ? 'text-atlas-amber' : 'text-atlas-muted hover:text-white'}`}>LIST_VIEW</button>
           </div>
           <button onClick={() => setIsModalOpen(true)} className="btn-amber">
             <Plus className="w-4 h-4" /> ADD_BOOKING
           </button>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {viewState === 'month' ? renderCalendar() : renderList()}
      </div>

      {/* Add Booking Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(16,19,27,0.8)', backdropFilter: 'blur(8px)' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="boarding-pass w-full max-w-2xl shadow-2xl flex flex-col"
            >
               <div className="flex justify-between items-center p-6 border-b border-atlas-border">
                 <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Ingest_Reservation</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-atlas-muted hover:text-white">
                   <X className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="p-6 overflow-y-auto space-y-8 no-scrollbar">
                  {/* AI Extract */}
                  <div className="bg-atlas-bg2 p-4 border border-atlas-border relative overflow-hidden">
                     <div className="sidebar-bloom -right-10 -top-10 opacity-20" />
                     <div className="relative z-10">
                        <div className="dot-matrix text-atlas-cyan text-[8px] mb-2 flex items-center gap-2">
                           <Type className="w-3 h-3" /> NEURAL_DECRYPTION_ACTIVE
                        </div>
                        <p className="text-[9px] text-atlas-muted uppercase mb-4 font-mono">PASTE_RESERVATION_EMAIL_CONTENT_TO_AUTO_EXTRACT_NODES</p>
                        <div className="flex gap-4">
                           <textarea value={emailPaste} onChange={e => setEmailPaste(e.target.value)} placeholder="01101001..." className="input-retro flex-1 h-20 uppercase font-mono text-[9px]" />
                           <button onClick={parseEmail} disabled={parsing || !emailPaste} className="btn-amber px-6 h-20">
                             {parsing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "DECRYPT"}
                           </button>
                        </div>
                     </div>
                  </div>

                  <form id="booking-form" onSubmit={handleAddBooking} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <div>
                         <label className="dot-matrix block mb-2">TYPE</label>
                         <select value={bType} onChange={e => setBType(e.target.value)} className="input-retro w-full uppercase">
                           <option value="flight">Flight</option>
                           <option value="hotel">Hotel</option>
                           <option value="tour">Tour</option>
                           <option value="restaurant">Restaurant</option>
                         </select>
                       </div>
                       <div>
                         <label className="dot-matrix block mb-2">IDENTIFIER</label>
                         <input required type="text" value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="DELTA_DL294" className="input-retro w-full uppercase" />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div>
                         <label className="dot-matrix block mb-2">START_VECTOR</label>
                         <input type="datetime-local" value={bStart} onChange={e => setBStart(e.target.value)} className="input-retro w-full" />
                       </div>
                       <div>
                         <label className="dot-matrix block mb-2">RETURN_VECTOR</label>
                         <input type="datetime-local" value={bEnd} onChange={e => setBEnd(e.target.value)} className="input-retro w-full" />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div>
                         <label className="dot-matrix block mb-2">CONFIRMATION_KEY</label>
                         <input type="text" value={bConf} onChange={e => setBConf(e.target.value)} placeholder="XYZ_777" className="input-retro w-full font-mono uppercase" />
                       </div>
                       <div>
                         <label className="dot-matrix block mb-2">RESOURCE_COST</label>
                         <input type="number" step="0.01" value={bCost} onChange={e => setBCost(e.target.value)} className="input-retro w-full" />
                       </div>
                    </div>
                  </form>
               </div>

               <div className="p-6 border-t border-atlas-border flex justify-end gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-[10px] font-bold text-atlas-muted uppercase px-4 text-white">ABORT</button>
                  <button form="booking-form" type="submit" disabled={adding} className="btn-amber px-8">COMMIT_INGESTION</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
