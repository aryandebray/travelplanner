import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MapPin, Search, Star, ExternalLink, Filter, Plus, Check } from 'lucide-react';
import ScoutPanel from '../components/ScoutPanel';

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
  const [filterHidden, setFilterHidden] = useState(false);
  const [savingItem, setSavingItem] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      supabase.from('trips').select('*').eq('id', tripId).single()
        .then(({ data }) => {
          if (data) {
            setTrip(data);
            setVibe(data.vibe || 'relaxed');
            setQuery(`Best ${type} in ${data.destination}`);
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

  const displayedResults = filterHidden ? results.filter(r => r.isHiddenGem) : results;

  const scoutPageData = {
    destination: trip?.destination,
    searchQuery: query,
    results: results.map(r => ({ name: r.name, type: r.type, rating: r.rating, isHiddenGem: r.isHiddenGem })),
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">AI Recommendations</h1>
        <p className="text-slate-400 text-sm">Powered by Gemini & Google Search</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          {/* Search Form */}
          <div className="glass-card p-5">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={`Search best spots in ${trip?.destination || 'your destination'}...`}
                  className="glass-input pl-10 text-sm"
                />
              </div>
              <select value={type} onChange={e => setType(e.target.value)} className="glass-input text-sm w-full md:w-44 appearance-none cursor-pointer">
                <option value="restaurants">Restaurants & Food</option>
                <option value="attractions">Attractions</option>
                <option value="bars">Bars & Nightlife</option>
                <option value="cafes">Coffee & Cafes</option>
                <option value="shopping">Shopping</option>
              </select>
              <button type="submit" disabled={searching} className="btn-gradient text-sm px-6 py-2.5 flex items-center justify-center gap-1.5 shrink-0">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search Places'}
              </button>
            </form>

            {results.length > 0 && (
              <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-xs font-medium text-slate-500">{results.length} places found</span>
                <button
                  onClick={() => setFilterHidden(!filterHidden)}
                  className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    filterHidden ? 'bg-accent-violet/10 border-accent-violet/20 text-accent-violet' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Filter className="w-3 h-3 mr-1.5" /> Hidden Gems Only
                </button>
              </div>
            )}
          </div>

          {searching && (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="relative w-16 h-16 mb-5">
                <div className="absolute inset-0 bg-accent-cyan/20 rounded-full animate-ping opacity-75" />
                <div className="relative bg-gradient-to-br from-accent-cyan to-accent-violet w-16 h-16 rounded-full flex items-center justify-center shadow-lg">
                  <Search className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white">Scouring the web...</h3>
              <p className="text-slate-400 mt-1 text-sm">Finding the best spots based on real-time data.</p>
            </div>
          )}

          {!searching && results.length > 0 && (
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}>
              <AnimatePresence>
                {displayedResults.map((rec, i) => (
                  <motion.div
                    key={`${rec.name}-${i}`}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card glow-border overflow-hidden flex flex-col"
                  >
                    <div className="p-5 flex-1">
                      {rec.isHiddenGem && (
                        <span className="inline-block px-2.5 py-1 bg-accent-violet/10 text-accent-violet text-[10px] font-bold uppercase tracking-wider rounded-full mb-3 border border-accent-violet/20">
                          💎 Hidden Gem
                        </span>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-base font-bold text-white pr-3">{rec.name}</h3>
                        {rec.rating && (
                          <div className="flex items-center bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-xs font-bold shrink-0 border border-amber-500/20">
                            <Star className="w-3 h-3 fill-current mr-0.5" /> {rec.rating}
                          </div>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mb-3 leading-relaxed line-clamp-2">{rec.description}</p>
                      <div className="bg-white/5 rounded-lg p-2.5 text-xs italic text-slate-400 border border-white/5 mb-3">
                        "{rec.reason}"
                      </div>
                      {rec.address && (
                        <div className="flex items-start text-slate-500 text-xs pt-2 border-t border-white/5">
                          <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5 text-accent-cyan" />
                          <span className="truncate">{rec.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-white/5 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(rec.name + ' ' + (rec.address || trip?.destination))}`, '_blank')}
                        className="flex items-center justify-center py-2 text-xs font-medium text-slate-400 hover:text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Info
                      </button>
                      <button
                        onClick={() => saveToItinerary(rec)}
                        disabled={savingItem === rec.name}
                        className={`flex items-center justify-center py-2 text-xs font-medium rounded-lg transition-all ${
                          savingItem === rec.name
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                            : 'btn-gradient'
                        }`}
                      >
                        {savingItem === rec.name ? <><Check className="w-3.5 h-3.5 mr-1" /> Saved</> : <><Plus className="w-3.5 h-3.5 mr-1" /> Itinerary</>}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {!searching && results.length > 0 && displayedResults.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">No hidden gems found. Try turning off the filter.</div>
          )}
        </div>

        {/* Scout Panel */}
        <div className="w-full lg:w-[320px] shrink-0 print:hidden">
          <div className="sticky top-6">
            <ScoutPanel
              context="Recommendations"
              pageData={scoutPageData}
              greeting="Hey! I'm Scout. Ask me about any recommendation, hidden gems, or for suggestions tailored to your trip vibe!"
              height="560px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
