import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Calendar as CalendarIcon, Clock, AlertTriangle, Download, X, Type } from 'lucide-react';
import { format, parseISO, isSameDay, differenceInDays, addDays, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import ScoutPanel from '../components/ScoutPanel';

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

const BOOKING_COLORS: Record<string, string> = {
  flight: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  hotel: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  tour: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  restaurant: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  other: 'bg-slate-500/15 text-slate-400 border-slate-500/20'
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
  const [bNotes, setBNotes] = useState('');
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

  const exportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Atlas//EN\n";
    bookings.forEach(b => {
      const start = b.start_datetime ? new Date(b.start_datetime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '';
      const end = b.end_datetime ? new Date(b.end_datetime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : start;
      if (start) icsContent += `BEGIN:VEVENT\nSUMMARY:${b.title}\nDTSTART:${start}\nDTEND:${end}\nDESCRIPTION:${b.notes || ''}\nEND:VEVENT\n`;
    });
    icsContent += "END:VCALENDAR";
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${trip?.name?.replace(/\s+/g, '_')}_calendar.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const scoutPageData = {
    bookings: bookings.map(b => ({ type: b.type, title: b.title, start: b.start_datetime, end: b.end_datetime, cost: b.cost })),
    tripDates: trip ? { start: trip.start_date, end: trip.end_date } : null,
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent-cyan" /></div>;

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInterval = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const blanks = Array.from({ length: startDay }).map((_, i) => <div key={`blank-${i}`} className="p-2 border-b border-r border-white/5 bg-white/[0.01] h-28" />);

    return (
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex gap-1">
            <button onClick={() => setCurrentMonth(addDays(monthStart, -1))} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">&larr;</button>
            <button onClick={() => setCurrentMonth(addDays(monthEnd, 1))} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">&rarr;</button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {blanks}
          {daysInterval.map(day => {
            const dayBookings = bookings.filter(b => b.start_datetime && isSameDay(parseISO(b.start_datetime), day));
            const isTripDay = trip && isWithinInterval(day, { start: parseISO(trip.start_date), end: parseISO(trip.end_date) });
            return (
              <div key={day.toISOString()} className={`p-2 border-b border-r border-white/5 h-28 overflow-y-auto ${isTripDay ? 'bg-accent-cyan/[0.03]' : ''}`}>
                <div className={`text-xs font-semibold mb-1.5 ${isTripDay ? 'text-accent-cyan' : 'text-slate-500'}`}>{format(day, 'd')}</div>
                <div className="space-y-1">
                  {dayBookings.map(b => (
                    <div key={b.id} className={`text-[10px] px-1.5 py-0.5 rounded border ${BOOKING_COLORS[b.type]} truncate`} title={b.title}>
                      {format(parseISO(b.start_datetime), 'HH:mm')} {b.title}
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
    const conflicts = new Set<string>();
    for (let i = 0; i < bookings.length - 1; i++) {
      if (bookings[i].end_datetime && bookings[i + 1].start_datetime && new Date(bookings[i].end_datetime) > new Date(bookings[i + 1].start_datetime)) {
        conflicts.add(bookings[i].id);
        conflicts.add(bookings[i + 1].id);
      }
    }
    return (
      <div className="space-y-3">
        {bookings.map(b => (
          <motion.div key={b.id} className="glass-card glow-border p-5 flex justify-between items-start">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 px-2 py-1 text-[10px] font-bold uppercase rounded-md border ${BOOKING_COLORS[b.type]}`}>{b.type}</span>
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  {b.title}
                  {b.start_datetime && differenceInDays(parseISO(b.start_datetime), new Date()) <= 1 && new Date(b.start_datetime) > new Date() && (
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded-full font-bold border border-red-500/20">Check-in soon</span>
                  )}
                </h4>
                <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {b.start_datetime ? format(parseISO(b.start_datetime), 'MMM d, h:mm a') : 'TBD'}
                  {b.end_datetime ? ` — ${format(parseISO(b.end_datetime), 'h:mm a')}` : ''}
                </p>
                {b.confirmation_number && (
                  <p className="mt-2 text-xs text-slate-400 bg-white/5 inline-block px-2 py-1 rounded border border-white/5">Conf: <span className="font-mono text-accent-cyan">{b.confirmation_number}</span></p>
                )}
              </div>
            </div>
            {conflicts.has(b.id) && (
              <div className="text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" /> Conflict
              </div>
            )}
          </motion.div>
        ))}
        {bookings.length === 0 && (
          <div className="text-center py-20 glass-card">
            <CalendarIcon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white">No bookings yet</h3>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Calendar & Bookings</h1>
          {trip && (
            <p className="text-slate-400 text-sm">
              {differenceInDays(parseISO(trip.start_date), new Date()) > 0
                ? <><span className="text-accent-cyan font-semibold">{differenceInDays(parseISO(trip.start_date), new Date())} days</span> until departure.</>
                : "Trip has started!"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-card p-1 flex text-xs font-medium">
            <button onClick={() => setViewState('month')} className={`px-3 py-1.5 rounded-lg transition-all ${viewState === 'month' ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-slate-400 hover:text-white'}`}>Month</button>
            <button onClick={() => setViewState('list')} className={`px-3 py-1.5 rounded-lg transition-all ${viewState === 'list' ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-slate-400 hover:text-white'}`}>List</button>
          </div>
          <button onClick={exportICS} className="flex items-center gap-1.5 px-3 py-2 text-xs glass-card text-slate-300 hover:text-white transition-all">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-gradient flex items-center gap-1.5 text-sm py-2">
            <Plus className="w-4 h-4" /> Add Booking
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {viewState === 'month' ? renderCalendar() : renderList()}
        </div>
        
        {/* Scout Panel */}
        <div className="w-full lg:w-[320px] shrink-0 print:hidden">
          <div className="sticky top-6">
            <ScoutPanel
              context="Calendar & Bookings"
              pageData={scoutPageData}
              greeting="Hey! I'm Scout. I can help with scheduling conflicts, suggest optimal booking times, or answer questions about your trip calendar!"
              height="560px"
            />
          </div>
        </div>
      </div>

      {/* Add Booking Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card w-full max-w-2xl overflow-hidden border border-white/10 max-h-[90vh] flex flex-col">
               <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
                 <h2 className="text-lg font-bold text-white">Add Booking</h2>
                 <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"><X className="w-5 h-5" /></button>
               </div>
               
               <div className="overflow-y-auto p-5 space-y-5">
                 {/* AI Auto-Fill */}
                 <div className="bg-gradient-to-r from-accent-cyan/10 to-accent-violet/10 p-4 rounded-xl border border-accent-cyan/10">
                   <h3 className="text-xs font-bold text-accent-cyan mb-2 flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> AI Auto-Fill</h3>
                   <p className="text-[10px] text-slate-400 mb-3">Paste your confirmation email and AI will extract the details.</p>
                   <div className="flex gap-2">
                     <textarea value={emailPaste} onChange={e => setEmailPaste(e.target.value)} placeholder="Paste email content here..." className="glass-input text-xs resize-none h-16 flex-1 font-mono" />
                     <button onClick={parseEmail} disabled={parsing || !emailPaste} className="btn-gradient px-3 text-xs shrink-0 self-end h-16 disabled:opacity-50">
                       {parsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Parse"}
                     </button>
                   </div>
                 </div>

                 <form id="booking-form" onSubmit={handleAddBooking} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Type</label>
                       <select value={bType} onChange={e => setBType(e.target.value)} className="glass-input text-sm appearance-none cursor-pointer">
                         <option value="flight">Flight</option><option value="hotel">Hotel</option><option value="tour">Tour</option><option value="restaurant">Restaurant</option><option value="other">Other</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Title</label>
                       <input required type="text" value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="Delta Flight DL294" className="glass-input text-sm" />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Start</label>
                       <input type="datetime-local" value={bStart} onChange={e => setBStart(e.target.value)} className="glass-input text-sm" />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">End</label>
                       <input type="datetime-local" value={bEnd} onChange={e => setBEnd(e.target.value)} className="glass-input text-sm" />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Confirmation #</label>
                       <input type="text" value={bConf} onChange={e => setBConf(e.target.value)} placeholder="XYZ123" className="glass-input text-sm font-mono" />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Cost</label>
                       <input type="number" step="0.01" value={bCost} onChange={e => setBCost(e.target.value)} placeholder="0.00" className="glass-input text-sm" />
                     </div>
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Notes</label>
                     <textarea value={bNotes} onChange={e => setBNotes(e.target.value)} rows={2} className="glass-input text-sm resize-none" placeholder="Terminal 4, check bags 2 hours before" />
                   </div>
                 </form>
               </div>
               <div className="p-5 border-t border-white/5 shrink-0">
                 <button form="booking-form" type="submit" disabled={adding} className="btn-gradient w-full py-3 flex justify-center items-center text-sm">
                   {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Booking"}
                 </button>
               </div>
            </motion.div>
          </div>
         )}
      </AnimatePresence>
    </div>
  );
}
