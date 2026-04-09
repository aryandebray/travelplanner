import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Download, Plane, Edit2, Trash2, X, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { parseISO, differenceInDays, format } from 'date-fns';
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
  
  const [travelers, setTravelers] = useState<number | ''>(2);
  const [vibe, setVibe] = useState<string[]>(['relaxed']);
  const [days, setDays] = useState<number | ''>(1);
  
  const [generating, setGenerating] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [saved, setSaved] = useState(false);
  const [extraPrompt, setExtraPrompt] = useState('');
  const [validationError, setValidationError] = useState('');
  
  const [editingActivity, setEditingActivity] = useState<{dayIndex: number, actIndex: number} | null>(null);
  const [editForm, setEditForm] = useState<Activity | null>(null);
  
  const [hasExisting, setHasExisting] = useState(false);
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

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trip) return;

    if (typeof travelers !== 'number' || travelers < 1) {
      setValidationError("ERR_INVALID_INPUT: TRAVELER COUNT MUST BE AT LEAST 1.");
      return;
    }
    if (typeof days !== 'number' || days < 1) {
      setValidationError("ERR_INVALID_INPUT: TEMPORAL DURATION MUST BE AT LEAST 1.");
      return;
    }
    if (days > 14) {
      setValidationError("ERR_INVALID_INPUT: TEMPORAL DURATION CANNOT EXCEED 14 DAYS.");
      return;
    }

    setValidationError('');
    setGenerating(true);
    setSaved(false);
    setItinerary([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: { destination: trip.destination, days: typeof days === 'number' && days > 0 ? days : 1, travelers: travelers || 1, vibe: vibe.join(', '), extraPrompt }
      });
      if (error) throw error;
      setItinerary(data);
    } catch (err: any) {
      console.error('Failed to generate:', err);
      alert('Error generating itinerary');
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

  const handleDeleteActivity = (dayIndex: number, actIndex: number) => {
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
    const newItinerary = [...itinerary];
    newItinerary[addModalDayIndex].activities.push({ ...newActivity });
    setItinerary(newItinerary);
    setAddModalOpen(false);
    setSaved(false);
    setHasExisting(false);
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
    setSaved(false);
    setHasExisting(false);
  };

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const exportAsPDF = () => {
    if (!trip || itinerary.length === 0) return;
    setExportMenuOpen(false);

    const doc = new jsPDF();
    const fileName = trip.destination.toLowerCase().replace(/\s+/g, '_');

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ATLAS ITINERARY', 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`${trip.name.toUpperCase()}  •  ${trip.destination.toUpperCase()}`, 14, 30);
    doc.text(`${format(parseISO(trip.start_date), 'MMM d, yyyy')} → ${format(parseISO(trip.end_date), 'MMM d, yyyy')}  •  ${trip.vibe.toUpperCase()}`, 14, 36);

    doc.setDrawColor(200);
    doc.line(14, 40, 196, 40);

    let yPos = 48;

    itinerary.forEach(day => {
      // Check if we need a new page
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40);
      doc.text(`DAY ${String(day.day_number).padStart(2, '0')}`, 14, yPos);
      yPos += 4;

      const tableData = day.activities.map(act => [
        act.time_block,
        act.activity_name,
        act.location,
        act.estimated_duration,
        act.estimated_cost
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Time', 'Activity', 'Location', 'Duration', 'Cost']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [240, 160, 80], textColor: [20, 20, 20], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;
    });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(160);
    doc.text('Exported by Atlas Terminal v4.0.1', 14, doc.internal.pageSize.height - 10);

    doc.save(`atlas_itinerary_${fileName}.pdf`);
  };

  const exportAsExcel = () => {
    if (!trip || itinerary.length === 0) return;
    setExportMenuOpen(false);

    const fileName = trip.destination.toLowerCase().replace(/\s+/g, '_');
    const rows: any[] = [];

    itinerary.forEach(day => {
      day.activities.forEach(act => {
        rows.push({
          Day: `Day ${day.day_number}`,
          'Time Block': act.time_block,
          Activity: act.activity_name,
          Description: act.description,
          Location: act.location,
          Duration: act.estimated_duration,
          'Est. Cost': act.estimated_cost
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 }, { wch: 14 }, { wch: 28 }, { wch: 40 },
      { wch: 22 }, { wch: 14 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, trip.destination.substring(0, 31));
    XLSX.writeFile(wb, `atlas_itinerary_${fileName}.xlsx`);
  };

  if (loading) {
    return <div className="p-8 flex justify-center h-full items-center"><Loader2 className="w-8 h-8 animate-spin text-atlas-amber" /></div>;
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
           <div className="dot-matrix text-atlas-cyan mb-2">SYSTEM_MANIFEST_ACTIVE</div>
           <h1 className="text-4xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Itinerary_Log</h1>
           {trip && (
             <div className="flex items-center gap-3 mt-2">
               <div className="text-[10px] font-bold text-atlas-amber uppercase tracking-widest font-mono">
                 {trip.destination} · {days} DAYS
               </div>
               <div className="w-1 h-1 bg-atlas-border rounded-full" />
               <div className="text-[10px] font-bold text-atlas-muted uppercase tracking-widest font-mono">
                 {trip.vibe.toUpperCase()} PROTOCOL
               </div>
             </div>
           )}
        </div>
        
        {itinerary.length > 0 && (
          <div className="flex gap-3">
              <div ref={exportRef} className="relative">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] border border-atlas-border text-atlas-muted hover:text-white hover:border-white transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  EXPORT
                  <ChevronDown className={`w-3 h-3 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {exportMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 boarding-pass shadow-2xl z-50 overflow-hidden"
                    style={{ background: 'var(--bg2)' }}
                  >
                    <button
                      onClick={exportAsPDF}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors group"
                    >
                      <FileText className="w-4 h-4 text-atlas-red group-hover:text-white transition-colors" />
                      <div>
                        <div className="text-[10px] font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk' }}>PDF Document</div>
                        <div className="dot-matrix text-[7px] opacity-40">.PDF_FORMAT</div>
                      </div>
                    </button>
                    <div style={{ borderTop: '1px dashed var(--border)' }} />
                    <button
                      onClick={exportAsExcel}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors group"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-atlas-green group-hover:text-white transition-colors" />
                      <div>
                        <div className="text-[10px] font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk' }}>Excel Spreadsheet</div>
                        <div className="dot-matrix text-[7px] opacity-40">.XLSX_FORMAT</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <button onClick={saveToTrip} className="btn-amber">
                {saved ? "DATA_SECURED" : "COMMIT_CHANGES"}
              </button>
           </div>
        )}
      </div>

      {(!hasExisting && itinerary.length === 0) || generating ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="boarding-pass p-8 max-w-xl w-full text-center relative overflow-hidden"
          >
             <div className="sidebar-bloom scale-150 -top-20 -left-20" />
             
             <div className={`w-20 h-20 border border-atlas-amber/30 rounded-2xl flex items-center justify-center mx-auto mb-8 relative ${generating ? 'animate-glow-pulse' : ''}`}>
                <Plane className={`w-10 h-10 text-atlas-amber ${generating ? 'animate-pulse' : ''}`} />
             </div>

             <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
               {generating ? "PROCESSING_GENERATIVE_DATA" : "INITIALIZE_SCOUT_ENGINE"}
             </h2>
             <p className="text-atlas-muted text-[10px] font-mono tracking-widest uppercase mb-10">
               Constructing optimal travel vector for {trip?.destination.toUpperCase()} sector.
             </p>

             <form onSubmit={handleGenerate} className="space-y-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="dot-matrix block mb-2 opacity-50"> TRAVELER_COUNT </label>
                     <input type="number" min="1" value={travelers} onChange={e => setTravelers(e.target.value === '' ? '' : parseInt(e.target.value))} className="input-retro w-full" />
                   </div>
                   <div>
                     <label className="dot-matrix block mb-2 opacity-50"> TEMPORAL_DURATION </label>
                     <input type="number" min="1" max="14" value={days} onChange={e => setDays(e.target.value === '' ? '' : parseInt(e.target.value))} className="input-retro w-full" />
                   </div>
                </div>

                <div>
                   <label className="dot-matrix block mb-2 opacity-50"> ADDITIONAL_OVERRIDE_PROTOCOLS </label>
                   <textarea 
                     value={extraPrompt} 
                     onChange={e => setExtraPrompt(e.target.value)} 
                     placeholder="E.G. NO_HIKING // VEGETARIAN_ONLY // MUSEUM_FOCUS..."
                     className="input-retro w-full h-24 resize-none uppercase"
                   />
                </div>

                {validationError && (
                  <div className="p-3 border border-atlas-red/30 bg-atlas-red/10 text-atlas-red text-[10px] font-bold uppercase tracking-[0.1em] rounded-lg">
                    {validationError}
                  </div>
                )}
                
                <button 
                  type="submit" 
                  disabled={generating}
                  className="btn-amber w-full py-4 text-sm"
                >
                  {generating ? "EXECUTING_CODE..." : "EXECUTE_GENERATION_SEQUENCES"}
                </button>
             </form>
          </motion.div>
        </div>
      ) : (
        <div className="space-y-16">
          {itinerary.map((day, dayIndex) => (
            <div key={day.day_number} className="relative">
              <div className="flex items-center gap-4 mb-8">
                 <div className="dot-matrix text-atlas-amber text-lg font-bold">DAY_{String(day.day_number).padStart(2, '0')}</div>
                 <div className="flex-1 h-[1px] bg-atlas-border opacity-20" />
                 <button 
                   onClick={() => openAddModal(dayIndex)}
                   className="text-[9px] font-bold text-atlas-cyan border border-atlas-cyan/30 px-3 py-1 hover:bg-atlas-cyan/10 transition-colors"
                 >
                   INSERT_NODE
                 </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {day.activities.map((act, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="boarding-pass flex flex-col group h-full"
                  >
                    <div className="p-5 flex-1">
                       <div className="flex justify-between items-start mb-6">
                          <div className="flex flex-col">
                             <span className="dot-matrix text-atlas-amber text-[8px] mb-1">TIME_BLOCK</span>
                             <span className="text-[11px] font-black text-white uppercase font-mono">{act.time_block}</span>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                             <button onClick={() => handleEditClick(dayIndex, i, act)} className="text-atlas-muted hover:text-white transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                             </button>
                             <button onClick={() => handleDeleteActivity(dayIndex, i)} className="text-atlas-muted hover:text-atlas-red transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                             </button>
                          </div>
                       </div>

                       <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2 group-hover:text-atlas-amber transition-colors">
                         {act.activity_name}
                       </h3>
                       <p className="text-atlas-muted text-[10px] leading-relaxed uppercase mb-6 font-mono">
                         {act.description}
                       </p>

                       <div className="perforation mb-4" />

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <div className="dot-matrix text-[7px] opacity-40">location</div>
                             <div className="text-[9px] text-white font-bold truncate tracking-widest">{act.location.toUpperCase()}</div>
                          </div>
                          <div className="space-y-1 text-right">
                             <div className="dot-matrix text-[7px] opacity-40">duration</div>
                             <div className="text-[9px] text-atlas-cyan font-bold">{act.estimated_duration.toUpperCase()}</div>
                          </div>
                       </div>
                    </div>
                    
                    <div className="bg-atlas-bg2/50 p-3 flex justify-between items-center border-t border-atlas-border">
                       <div className="dot-matrix text-[7px] text-atlas-muted">COST_ANALYSIS</div>
                       <div className="text-atlas-amber font-black text-xs font-mono">{act.estimated_cost}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(addModalOpen || editingActivity) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(16,19,27,0.8)', backdropFilter: 'blur(8px)' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="boarding-pass w-full max-w-lg shadow-2xl"
            >
               <div className="flex justify-between items-center p-6 border-b border-atlas-border">
                 <h2 className="text-xl font-bold text-white uppercase tracking-tighter">
                   {addModalOpen ? "Insert_Node" : "Edit_Node"}
                 </h2>
                 <button onClick={() => { setAddModalOpen(false); setEditingActivity(null); }} className="text-atlas-muted hover:text-white">
                   <X className="w-5 h-5" />
                 </button>
               </div>
               
               <form onSubmit={addModalOpen ? handleAddActivity : (e) => { e.preventDefault(); handleSaveEdit(); }} className="p-6 space-y-6">
                 <div>
                   <label className="dot-matrix block mb-2">IDENTIFIER</label>
                   <input required type="text" value={addModalOpen ? newActivity.activity_name : editForm?.activity_name} onChange={e => addModalOpen ? setNewActivity({...newActivity, activity_name: e.target.value}) : setEditForm({...editForm!, activity_name: e.target.value})} className="input-retro w-full uppercase" />
                 </div>
                 
                 <div>
                   <label className="dot-matrix block mb-2">LOG_DESCRIPTION</label>
                   <textarea value={addModalOpen ? newActivity.description : editForm?.description} onChange={e => addModalOpen ? setNewActivity({...newActivity, description: e.target.value}) : setEditForm({...editForm!, description: e.target.value})} className="input-retro w-full h-20 resize-none uppercase" />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="dot-matrix block mb-2">LOCATION</label>
                      <input type="text" value={addModalOpen ? newActivity.location : editForm?.location} onChange={e => addModalOpen ? setNewActivity({...newActivity, location: e.target.value}) : setEditForm({...editForm!, location: e.target.value})} className="input-retro w-full uppercase" />
                    </div>
                    <div>
                      <label className="dot-matrix block mb-2">TIME_WINDOW</label>
                      <input type="text" value={addModalOpen ? newActivity.time_block : editForm?.time_block} onChange={e => addModalOpen ? setNewActivity({...newActivity, time_block: e.target.value}) : setEditForm({...editForm!, time_block: e.target.value})} className="input-retro w-full uppercase" />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="dot-matrix block mb-2">TEMPORAL_LENGTH</label>
                      <input type="text" value={addModalOpen ? newActivity.estimated_duration : editForm?.estimated_duration} onChange={e => addModalOpen ? setNewActivity({...newActivity, estimated_duration: e.target.value}) : setEditForm({...editForm!, estimated_duration: e.target.value})} className="input-retro w-full uppercase" />
                    </div>
                    <div>
                      <label className="dot-matrix block mb-2">RESOURCE_COST</label>
                      <input type="text" value={addModalOpen ? newActivity.estimated_cost : editForm?.estimated_cost} onChange={e => addModalOpen ? setNewActivity({...newActivity, estimated_cost: e.target.value}) : setEditForm({...editForm!, estimated_cost: e.target.value})} className="input-retro w-full uppercase" />
                    </div>
                 </div>

                 <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={() => { setAddModalOpen(false); setEditingActivity(null); }} className="text-[10px] font-bold text-atlas-muted uppercase px-4">ABORT</button>
                    <button type="submit" className="btn-amber px-8">EXECUTE_COMMIT</button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
