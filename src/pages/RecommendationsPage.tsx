import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, MapPin, Search, Star, Compass } from 'lucide-react';

type Recommendation = {
  name: string;
  description: string;
  type: string;
  rating?: number;
  address?: string;
  isHiddenGem: boolean;
  reason: string;
};

export default function RecommendationsPage() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState<any>(null);
  
  const [query, setQuery] = useState('');
  const [type, setType] = useState('restaurants');
  const [vibe, setVibe] = useState('');
  
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [savingItem, setSavingItem] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      supabase.from('trips').select('*').eq('id', tripId).single()
        .then(({ data }) => {
          if (data) {
            setTrip(data);
            setVibe(data.vibe || 'relaxed');
            setQuery(`BEST ${type.toUpperCase()} IN ${data.destination.toUpperCase()}`);
          }
        });
    }
  }, [tripId, type]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setSearching(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('get-recommendations', {
        body: { query, destination: trip?.destination || '', vibe }
      });
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error(err);
      alert('Error fetching recommendations.');
    } finally {
      setSearching(false);
    }
  };

  const saveToItinerary = async (rec: Recommendation) => {
    if (!tripId) return;
    setSavingItem(rec.name);
    try {
      const { data: days } = await supabase.from('itinerary_items').select('day_number').eq('trip_id', tripId).order('day_number', { ascending: true }).limit(1);
      const day = days && days.length > 0 ? days[0].day_number : 1;
      const { error } = await supabase.from('itinerary_items').insert({
        trip_id: tripId, day_number: day, time_block: type === 'restaurants' ? 'evening' : 'afternoon',
        activity_name: rec.name, description: rec.description, estimated_duration: '2 hours',
        estimated_cost: '$$', location: rec.address || trip.destination
      });
      if (error) throw error;
      setTimeout(() => setSavingItem(null), 2000);
    } catch (err) { console.error(err); alert('Failed to save'); setSavingItem(null); }
  };

  if (!trip && !searching) return <div className="p-8 flex justify-center h-full items-center"><Loader2 className="w-8 h-8 animate-spin text-atlas-amber" /></div>;

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
           <div className="dot-matrix text-atlas-cyan mb-2">SCOUT_QUERY_ENGINE_v4</div>
           <h1 className="text-4xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Exploration_Hub</h1>
           <p className="text-[10px] font-bold text-atlas-muted uppercase tracking-widest font-mono mt-2">
             SEMANTIC_SEARCH_CONNECTED // REALTIME_DATA_INGESTION
           </p>
        </div>
      </div>

      <div className="space-y-12">
        {/* Search Panel */}
        <div className="boarding-pass p-6 bg-atlas-bg2/50 relative overflow-hidden">
           <div className="sidebar-bloom -right-20 -bottom-20 opacity-20" />
           <form onSubmit={handleSearch} className="relative z-10 space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                 <div className="flex-1">
                    <label className="dot-matrix block mb-2 opacity-50"> SEARCH_VECTOR </label>
                    <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-atlas-muted" />
                       <input 
                         type="text" value={query} onChange={e => setQuery(e.target.value)}
                         className="input-retro w-full pl-12 uppercase" 
                         placeholder="INPUT_SEARCH_QUERY..."
                       />
                    </div>
                 </div>
                 <div className="md:w-64">
                    <label className="dot-matrix block mb-2 opacity-50"> CATEGORY_FILTER </label>
                    <select value={type} onChange={e => setType(e.target.value)} className="input-retro w-full uppercase cursor-pointer">
                      <option value="restaurants">Restaurants</option>
                      <option value="attractions">Attractions</option>
                      <option value="bars">Nightlife</option>
                      <option value="cafes">Cafes</option>
                    </select>
                 </div>
                 <div className="md:pt-6">
                    <button type="submit" disabled={searching} className="btn-amber w-full h-[46px] px-10 flex items-center justify-center gap-2">
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Compass className="w-4 h-4" /> INITIATE_SCAN</>}
                    </button>
                 </div>
              </div>
           </form>
        </div>

        {/* Results Grid */}
        {searching && (
          <div className="py-20 flex flex-col items-center justify-center space-y-6">
             <div className="w-16 h-16 border-4 border-atlas-amber border-t-transparent rounded-full animate-spin" />
             <div className="dot-matrix text-atlas-amber text-xs animate-pulse uppercase">Scanning_Global_Frequencies...</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((rec, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="boarding-pass flex flex-col group h-full"
            >
              <div className="p-5 flex-1 flex flex-col">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                       {rec.isHiddenGem ? (
                         <div className="text-[8px] font-black bg-atlas-amber/10 text-atlas-amber border border-atlas-amber/30 px-2 py-0.5 rounded-full uppercase tracking-widest mb-1 animate-shimmer">HIDDEN_GEM_FOUND</div>
                       ) : (
                         <div className="dot-matrix text-atlas-muted text-[8px] mb-1">RECOMMENDED_NODE</div>
                       )}
                       <div className="text-[10px] font-black text-white uppercase font-mono">{rec.type.toUpperCase()}</div>
                    </div>
                    {rec.rating && (
                       <div className="flex items-center gap-1.5 text-atlas-cyan">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-[10px] font-bold font-mono">{rec.rating}</span>
                       </div>
                    )}
                 </div>

                 <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-atlas-amber transition-colors">
                   {rec.name}
                 </h3>
                 <p className="text-atlas-muted text-[10px] leading-relaxed uppercase mb-4 font-mono line-clamp-2">
                   {rec.description}
                 </p>

                 <div className="bg-atlas-bg2 p-3 border border-atlas-border mb-4 italic text-[9px] text-atlas-muted uppercase font-mono">
                   " {rec.reason} "
                 </div>

                 <div className="mt-auto space-y-4">
                    <div className="perforation" />
                    <div className="flex items-center gap-2">
                       <MapPin className="w-3 h-3 text-atlas-cyan" />
                       <div className="text-[9px] text-white font-bold truncate tracking-widest uppercase">{rec.address || 'SECTOR_LOC_UNKNOWN'}</div>
                    </div>
                 </div>
              </div>
              
              <div className="p-3 bg-atlas-bg2/50 border-t border-atlas-border grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(rec.name + ' ' + (rec.address || ''))}`, '_blank')}
                   className="py-2 text-[9px] font-bold text-atlas-muted border border-atlas-border hover:text-white hover:border-white transition-all uppercase tracking-widest"
                 >
                   INTEL_PROBE
                 </button>
                 <button 
                   onClick={() => saveToItinerary(rec)}
                   disabled={savingItem === rec.name}
                   className="btn-amber text-[9px] py-2"
                 >
                   {savingItem === rec.name ? 'COMMITTED' : 'ADD_TO_LOG'}
                 </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
