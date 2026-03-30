import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, FileText, Check, MapPin, Clock, Users, DollarSign, Trash2, Plus, Edit2, X, Save, Send, Bot, Sparkles, Download, ChevronDown } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  vibe: string;
};

type Activity = {
  time_block: string;
  activity_name: string;
  description: string;
  estimated_duration: string;
  estimated_cost: string;
  location: string;
};

type ItineraryDay = {
  day_number: number;
  activities: Activity[];
};

export default function ItineraryPage() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [travelers, setTravelers] = useState(2);
  const [vibe, setVibe] = useState<string[]>(['relaxed']);
  const [days, setDays] = useState(1);
  
  const [generating, setGenerating] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [saved, setSaved] = useState(false);
  const [extraPrompt, setExtraPrompt] = useState('');
  
  const [editingActivity, setEditingActivity] = useState<{dayIndex: number, actIndex: number} | null>(null);
  const [editForm, setEditForm] = useState<Activity | null>(null);
  
  type ChatMessage = { role: 'user' | 'ai'; content: string };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{role: 'ai', content: "Hey! I'm Scout, your AI co-pilot. Once you generate an itinerary, ask me to add a coffee stop, swap activities, change times — anything!"}]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [hasExisting, setHasExisting] = useState(false);

  // Add Activity Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalDayIndex, setAddModalDayIndex] = useState<number>(0);
  const [newActivity, setNewActivity] = useState<Activity>({
    time_block: '',
    activity_name: '',
    description: '',
    estimated_duration: '',
    estimated_cost: '',
    location: ''
  });

  useEffect(() => {
    fetchTripAndItinerary();
  }, [tripId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const fetchTripAndItinerary = async () => {
    try {
      if (!tripId) return;
      const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single();
      if (tripData) {
        setTrip(tripData);
        setVibe(tripData.vibe ? [tripData.vibe] : ['relaxed']);
        const calcDays = differenceInDays(parseISO(tripData.end_date), parseISO(tripData.start_date)) + 1;
        setDays(calcDays > 0 ? calcDays : 1);
      }
      const { data: items } = await supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('day_number', { ascending: true });
      if (items && items.length > 0) {
        setHasExisting(true);
        const grouped: Record<number, Activity[]> = {};
        items.forEach(item => {
          if (!grouped[item.day_number]) grouped[item.day_number] = [];
          grouped[item.day_number].push({
            time_block: item.time_block,
            activity_name: item.activity_name,
            description: item.description,
            estimated_duration: item.estimated_duration,
            estimated_cost: item.estimated_cost,
            location: item.location
          });
        });
        const structured: ItineraryDay[] = Object.keys(grouped).map(day => ({
          day_number: parseInt(day),
          activities: grouped[parseInt(day)]
        }));
        setItinerary(structured);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = (dayIndex: number, actIndex: number) => {
    if (!confirm('Delete this activity?')) return;
    const newItinerary = [...itinerary];
    newItinerary[dayIndex].activities.splice(actIndex, 1);
    setItinerary(newItinerary);
    setSaved(false);
    setHasExisting(false);
  };

  const openAddModal = (dayIndex: number) => {
    setAddModalDayIndex(dayIndex);
    setNewActivity({ time_block: '', activity_name: '', description: '', estimated_duration: '', estimated_cost: '', location: '' });
    setAddModalOpen(true);
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.activity_name.trim()) return;
    const newItinerary = [...itinerary];
    newItinerary[addModalDayIndex].activities.push({
      ...newActivity,
      time_block: newActivity.time_block || 'Afternoon',
      description: newActivity.description || 'Custom added activity.',
      estimated_duration: newActivity.estimated_duration || '2 hours',
      estimated_cost: newActivity.estimated_cost || 'Varies',
    });
    setItinerary(newItinerary);
    setSaved(false);
    setHasExisting(false);
    setAddModalOpen(false);
  };

  const handleEditClick = (dayIndex: number, actIndex: number, act: Activity) => {
    setEditingActivity({ dayIndex, actIndex });
    setEditForm({ ...act });
  };

  const handleSaveEdit = () => {
    if (!editingActivity || !editForm) return;
    const newItinerary = [...itinerary];
    newItinerary[editingActivity.dayIndex].activities[editingActivity.actIndex] = editForm;
    setItinerary(newItinerary);
    setEditingActivity(null);
    setEditForm(null);
    setSaved(false);
    setHasExisting(false);
  };

  const handleCancelEdit = () => {
    setEditingActivity(null);
    setEditForm(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetDayIndex: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-white/5');
    try {
      const { sourceDayIndex, sourceActIndex } = JSON.parse(e.dataTransfer.getData('application/json'));
      const newItinerary = [...itinerary];
      const [movedItem] = newItinerary[sourceDayIndex].activities.splice(sourceActIndex, 1);
      newItinerary[targetDayIndex].activities.push(movedItem);
      setItinerary(newItinerary);
      setSaved(false);
      setHasExisting(false);
    } catch (err) {}
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || itinerary.length === 0) return;
    const newUserMsg = { role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('itinerary-chat', {
        body: { itinerary, message: newUserMsg.content, history: chatMessages }
      });
      if (error) throw error;
      setChatMessages(prev => [...prev, { role: 'ai', content: data.message }]);
      if (data.itinerary && Array.isArray(data.itinerary)) {
        setItinerary(data.itinerary);
        setSaved(false);
        setHasExisting(false);
      }
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I ran into an error processing that!' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trip) return;
    setGenerating(true);
    setSaved(false);
    setItinerary([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: { destination: trip.destination, days: days > 0 ? days : 1, travelers, vibe: vibe.join(', '), extraPrompt }
      });
      if (error) throw error;
      setItinerary(data);
    } catch (err: any) {
      console.error('Failed to generate:', err);
      const details = err.context ? JSON.stringify(await err.context.json().catch(()=>err.context)) : err.message;
      alert('Error generating itinerary: ' + details);
    } finally {
      setGenerating(false);
    }
  };

  const saveToTrip = async () => {
    if (!tripId || itinerary.length === 0) return;
    try {
      await supabase.from('itinerary_items').delete().eq('trip_id', tripId);
      const insertData = itinerary.flatMap(day => 
        day.activities.map(act => ({
          trip_id: tripId, day_number: day.day_number, time_block: act.time_block,
          activity_name: act.activity_name, description: act.description,
          estimated_duration: act.estimated_duration, estimated_cost: act.estimated_cost, location: act.location
        }))
      );
      const { error } = await supabase.from('itinerary_items').insert(insertData);
      if (error) throw error;
      setSaved(true);
      setHasExisting(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save itinerary');
    }
  };

  const [exportOpen, setExportOpen] = useState(false);

  const exportAsPDF = () => {
    if (!trip || itinerary.length === 0) return;
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(`Atlas — ${trip.name}`, 14, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Destination: ${trip.destination}`, 14, 28);

    const rows: string[][] = [];
    itinerary.forEach(day => {
      day.activities.forEach(act => {
        rows.push([
          `Day ${day.day_number}`,
          act.time_block,
          act.activity_name,
          act.description,
          act.location,
          act.estimated_duration,
          act.estimated_cost
        ]);
      });
    });

    autoTable(doc, {
      startY: 34,
      head: [['Day', 'Time', 'Activity', 'Description', 'Location', 'Duration', 'Cost']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [6, 182, 212] },
      columnStyles: {
        3: { cellWidth: 45 },
      },
    });

    doc.save(`${trip.name.replace(/\s+/g, '_')}_itinerary.pdf`);
    setExportOpen(false);
  };

  const exportAsExcel = () => {
    if (!trip || itinerary.length === 0) return;
    const rows = itinerary.flatMap(day =>
      day.activities.map(act => ({
        Day: `Day ${day.day_number}`,
        Time: act.time_block,
        Activity: act.activity_name,
        Description: act.description,
        Location: act.location,
        Duration: act.estimated_duration,
        'Est. Cost': act.estimated_cost
      }))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 24 }, { wch: 40 }, { wch: 24 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itinerary');
    XLSX.writeFile(wb, `${trip.name.replace(/\s+/g, '_')}_itinerary.xlsx`);
    setExportOpen(false);
  };

  const [isChatOpen, setIsChatOpen] = useState(false);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent-cyan" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto pb-24 sm:pb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Itinerary</h1>
          {trip && (
            <p className="text-slate-400 flex items-center gap-1.5 text-sm">
              <MapPin className="w-4 h-4 text-accent-cyan" /> {trip.destination}
            </p>
          )}
        </div>
        
        {itinerary.length > 0 && (
          <div className="flex gap-2 print:hidden">
            <div className="relative">
              <button onClick={() => setExportOpen(!exportOpen)} className="flex items-center gap-1.5 px-3 py-2 text-sm glass-card text-slate-300 hover:text-white transition-all">
                <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3 h-3" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 glass-card border border-white/10 rounded-xl overflow-hidden z-30 shadow-xl">
                  <button onClick={exportAsPDF} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                    <FileText className="w-3.5 h-3.5 text-red-400" /> PDF (.pdf)
                  </button>
                  <button onClick={exportAsExcel} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all border-t border-white/5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" /> Excel (.xlsx)
                  </button>
                </div>
              )}
            </div>
            <button onClick={saveToTrip} className="btn-gradient flex items-center gap-1.5 text-sm py-2">
              <AnimatePresence mode="wait">
                {saved ? (
                  <motion.span key="saved" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Saved!
                  </motion.span>
                ) : (
                  <motion.span key="save" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Save to Trip
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        )}
      </div>

      {(!hasExisting && itinerary.length === 0) || generating ? (
        // ... (Generating state stays largely same)
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 sm:p-8 max-w-2xl mx-auto"
        >
          <div className="text-center mb-8 relative">
            <div className={`w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-violet/20 flex items-center justify-center mx-auto mb-4 transition-all duration-500 ${generating ? 'animate-glow-pulse scale-110' : ''}`}>
              <Sparkles className={`w-8 sm:w-10 h-8 sm:h-10 text-accent-cyan ${generating ? 'animate-spin' : ''}`} style={{ animationDuration: generating ? '3s' : '' }} />
            </div>
            {generating && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-gradient-to-tr from-accent-cyan/30 to-accent-violet/30 rounded-full blur-3xl z-0"
              />
            )}
            <h2 className="text-xl sm:text-2xl font-bold text-white relative z-10">Generate AI Itinerary</h2>
            <p className="text-slate-400 mt-2 text-xs sm:text-sm relative z-10">Let Scout build the perfect schedule for {trip?.name}.</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Days</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="number" min="1" max="14" value={days} onChange={e => setDays(parseInt(e.target.value) || 1)} className="glass-input pl-10" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Travelers</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="number" min="1" value={travelers} onChange={e => setTravelers(parseInt(e.target.value) || 1)} className="glass-input pl-10" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Vibe</label>
              <div className="flex flex-wrap gap-2">
                {['adventure', 'relaxed', 'cultural', 'party', 'family', 'luxury', 'budget'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      if (vibe.includes(v)) { if (vibe.length > 1) setVibe(vibe.filter(item => item !== v)); }
                      else { setVibe([...vibe, v]); }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      vibe.includes(v)
                      ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Additional Requests (Optional)</label>
              <textarea 
                value={extraPrompt} 
                onChange={e => setExtraPrompt(e.target.value)} 
                placeholder="E.g., We only want vegetarian food, no hiking, prefer museums in the morning."
                className="glass-input resize-none h-20 text-sm"
              />
            </div>

            <button 
              type="submit" 
              disabled={generating}
              className="btn-gradient w-full py-4 text-base flex justify-center items-center gap-2"
            >
              {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> Crafting your perfect trip...</> : <>Generate Magic <Sparkles className="w-4 h-4" /></>}
            </button>
          </form>
        </motion.div>
      ) : (
        <div className="relative">
          {/* Itinerary Cards */}
          <motion.div className="space-y-10 w-full">
            {itinerary.map((day, dayIndex) => (
              <motion.div key={day.day_number} className="relative">
                <div className="sticky top-[60px] md:top-0 z-20 py-3 mb-3 bg-atlas-bg/80 backdrop-blur-lg print:bg-transparent">
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-accent-cyan/20 to-accent-violet/20 text-accent-cyan border border-accent-cyan/20">
                      Day {day.day_number}
                    </span>
                  </h2>
                </div>
                
                <div 
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 min-h-[100px] sm:p-3 sm:-mx-3 rounded-xl transition-colors duration-200"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-white/5'); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('bg-white/5')}
                  onDrop={(e) => handleDrop(e, dayIndex)}
                >
                  {day.activities.map((act, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ sourceDayIndex: dayIndex, sourceActIndex: i }))}
                      className="cursor-move h-full"
                    >
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24, delay: i * 0.05 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="glass-card glow-border p-4 sm:p-5 relative overflow-hidden group h-full"
                      >
                        <div className="relative z-10">
                          {editingActivity?.dayIndex === dayIndex && editingActivity?.actIndex === i && editForm ? (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center mb-2">
                                <input type="text" value={editForm.time_block} onChange={(e) => setEditForm({...editForm, time_block: e.target.value})}
                                  className="glass-input py-1 px-2 text-xs font-semibold uppercase tracking-wide w-36" placeholder="Time (e.g. 10:00 AM)" />
                                <div className="flex gap-1.5">
                                  <button onClick={handleSaveEdit} className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-emerald-500/10" title="Save"><Save className="w-4 h-4" /></button>
                                  <button onClick={handleCancelEdit} className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/10" title="Cancel"><X className="w-4 h-4" /></button>
                                </div>
                              </div>
                              <input type="text" value={editForm.activity_name} onChange={(e) => setEditForm({...editForm, activity_name: e.target.value})}
                                className="glass-input text-base font-bold py-1.5" placeholder="Activity Name" />
                              <textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                className="glass-input text-sm resize-none h-16" placeholder="Description" />
                              <div className="space-y-2 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                                  <input type="text" value={editForm.location} onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                                    className="glass-input py-1 text-sm" placeholder="Location" />
                                </div>
                                <div className="flex gap-2">
                                  <div className="flex items-center gap-1.5 text-sm flex-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <input type="text" value={editForm.estimated_duration} onChange={(e) => setEditForm({...editForm, estimated_duration: e.target.value})}
                                      className="glass-input py-1 text-sm transition-all" placeholder="Duration" />
                                  </div>
                                  <div className="flex items-center gap-1.5 text-sm flex-1">
                                    <DollarSign className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <input type="text" value={editForm.estimated_cost} onChange={(e) => setEditForm({...editForm, estimated_cost: e.target.value})}
                                      className="glass-input py-1 text-sm border-emerald-500/20" placeholder="Cost" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start mb-3">
                                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                                  {act.time_block}
                                </span>
                                <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); handleEditClick(dayIndex, i, act); }} className="text-slate-500 hover:text-accent-cyan p-1 rounded hover:bg-white/5" title="Edit">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteActivity(dayIndex, i); }} className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <h3 className="text-base font-bold text-white mb-1.5 leading-tight">{act.activity_name}</h3>
                              <p className="text-slate-400 text-xs mb-4 line-clamp-2 md:group-hover:line-clamp-none transition-all leading-relaxed">{act.description}</p>
                              <div className="space-y-1.5 pt-3 border-t border-white/5">
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <MapPin className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                                  <span className="truncate">{act.location}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {act.estimated_duration}</span>
                                  <span className="flex items-center gap-0.5 font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <DollarSign className="w-2.5 h-2.5" /> {act.estimated_cost}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 mb-6 flex justify-center print:hidden">
                  <button 
                    onClick={() => openAddModal(dayIndex)}
                    className="flex items-center gap-1.5 text-xs font-medium text-accent-cyan bg-accent-cyan/5 hover:bg-accent-cyan/10 px-3 py-2 rounded-lg transition-all border border-accent-cyan/10 border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Activity
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Scout FAB & Overlay */}
          <div className="fixed bottom-0 right-0 p-6 z-[100] print:hidden">
            <AnimatePresence>
              {isChatOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="chat-overlay glass-card overflow-hidden flex flex-col mb-4 rounded-2xl border border-white/10"
                >
                  <div className="bg-gradient-to-r from-accent-cyan/20 to-accent-violet/20 p-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shadow-lg shadow-accent-cyan/20">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">Scout</h3>
                        <p className="text-[10px] text-slate-400">AI Co-pilot</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsChatOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-r from-accent-cyan to-accent-violet text-white rounded-br-sm shadow-md' 
                            : 'bg-white/5 border border-white/5 text-slate-300 rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/5 p-3 rounded-2xl rounded-bl-sm">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                            <div className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                            <div className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  
                  <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Ask Scout to change things..."
                        className="glass-input py-2.5 text-xs flex-1"
                        disabled={chatLoading}
                      />
                      <button 
                        type="submit"
                        disabled={chatLoading || !chatInput.trim()}
                        className="btn-gradient p-2.5 rounded-xl disabled:opacity-30 shadow-lg shadow-accent-cyan/10"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`scout-fab w-14 h-14 rounded-2xl flex items-center justify-center relative group overflow-hidden ${isChatOpen ? 'bg-slate-800 border border-white/10' : 'btn-gradient'}`}
              >
                <AnimatePresence mode="wait">
                  {isChatOpen ? (
                    <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
                      <X className="w-6 h-6 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div key="open" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="relative">
                      <Bot className="w-7 h-7 text-white" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Visual flare */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-lg overflow-hidden border border-white/10"
            >
              <div className="flex justify-between items-center p-5 border-b border-white/5">
                <h2 className="text-lg font-bold text-white">Add Activity — Day {itinerary[addModalDayIndex]?.day_number}</h2>
                <button onClick={() => setAddModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddActivity} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Activity Name *</label>
                    <input required type="text" value={newActivity.activity_name} onChange={e => setNewActivity({...newActivity, activity_name: e.target.value})} placeholder="Visit the Louvre" className="glass-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Time</label>
                    <input type="text" value={newActivity.time_block} onChange={e => setNewActivity({...newActivity, time_block: e.target.value})} placeholder="e.g. 10:00 AM" className="glass-input text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea value={newActivity.description} onChange={e => setNewActivity({...newActivity, description: e.target.value})} placeholder="Explore the world-famous art museum..." className="glass-input text-sm resize-none h-20" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input type="text" value={newActivity.location} onChange={e => setNewActivity({...newActivity, location: e.target.value})} placeholder="Rue de Rivoli, Paris" className="glass-input text-sm pl-9" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Duration</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input type="text" value={newActivity.estimated_duration} onChange={e => setNewActivity({...newActivity, estimated_duration: e.target.value})} placeholder="2 hours" className="glass-input text-sm pl-9" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Est. Cost</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
                      <input type="text" value={newActivity.estimated_cost} onChange={e => setNewActivity({...newActivity, estimated_cost: e.target.value})} placeholder="$20" className="glass-input text-sm pl-9" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">Cancel</button>
                  <button type="submit" className="btn-gradient flex items-center gap-1.5 text-sm py-2">
                    <Plus className="w-4 h-4" /> Add Activity
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
