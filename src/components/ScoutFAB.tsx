import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight, Compass } from 'lucide-react';
import { supabase } from '../lib/supabase';
// import ParticleField from './3d/ParticleField';
import AuraBackground from './AuraBackground';

type ChatMessage = { role: 'user' | 'ai'; content: string };

type ScoutFABProps = {
  context: string;
  pageData?: any;
  onStructuredResponse?: (data: any) => void;
};

export default function ScoutFAB({ context, pageData, onStructuredResponse }: ScoutFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: "SYSTEM_ONLINE // SCOUT_v2.0_READY // HOW_CAN_I_ASSIST_YOUR_VECTOR?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const newUserMsg = { role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('scout-chat', {
        body: {
          message: newUserMsg.content,
          history: chatMessages.slice(-5), // Keep last 5 for context to avoid token bloat
          context,
          pageData: pageData || null
        }
      });
      if (error) throw error;
      
      setChatMessages(prev => [...prev, { role: 'ai', content: data.message.toUpperCase() }]);
      if (data.structured && onStructuredResponse) {
        onStructuredResponse(data.structured);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'ai', content: 'COMMUNICATION_FAILURE // RETRY_CONNECTION' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      <motion.button 
        whileHover={{ scale: 1.05, rotate: 2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-atlas-bg border-2 border-atlas-amber shadow-[0_0_20px_rgba(240,160,80,0.3)] rounded-2xl flex flex-col items-center justify-center z-[1000] overflow-hidden group"
      >
        <div className="absolute inset-0 bg-atlas-amber opacity-0 group-hover:opacity-10 transition-opacity" />
        {isOpen ? (
          <X className="w-8 h-8 text-atlas-amber" />
        ) : (
          <div className="flex flex-col items-center">
             <div className="text-[14px] font-black text-atlas-amber tracking-tighter leading-none">SCO</div>
             <div className="w-8 h-[1px] bg-atlas-amber/30 my-1" />
             <div className="dot-matrix text-[6px] text-atlas-amber animate-pulse">ACTIVE</div>
          </div>
        )}
      </motion.button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 w-[400px] h-[550px] boarding-pass shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[1000] overflow-hidden flex flex-col bg-atlas-bg/95 backdrop-blur-md border-atlas-amber/50"
          >
            <div className="absolute inset-0 z-0 pointer-events-none">
               <AuraBackground />
            </div>
            
            <div className="relative z-10 h-full flex flex-col">
              {/* Header */}
              <div className="p-5 border-b border-atlas-border bg-atlas-bg2/80">
                <div className="overflow-hidden whitespace-nowrap mb-2">
                  <motion.div 
                    animate={{ x: [0, -600] }} 
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="dot-matrix text-atlas-amber text-[8px] opacity-60 uppercase"
                  >
                    SCANNING_USER_TRAJECTORY · ANALYZING_SPATIAL_NODES · INGESTING_REALTIME_MANIFESTS · OPTIMIZING_TRAVEL_VECTOR · · ·
                  </motion.div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-atlas-amber/10 border border-atlas-amber/30 flex items-center justify-center">
                        <Compass className="w-4 h-4 text-atlas-amber animate-spin-slow" />
                     </div>
                     <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tighter">SCOUT_v2.0</h3>
                        <div className="dot-matrix text-[7px] text-atlas-cyan flex items-center gap-1">
                           <div className="w-1 h-1 rounded-full bg-atlas-cyan animate-pulse" />
                           NEURAL_LINK_ESTABLISHED
                        </div>
                     </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="text-atlas-muted hover:text-white transition-colors">
                     <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
                {chatMessages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] p-4 boarding-pass ${
                      msg.role === 'user' 
                        ? 'bg-atlas-bg border-r-2 border-r-atlas-amber' 
                        : 'bg-atlas-bg2 border-l-2 border-l-atlas-cyan'
                    }`}>
                      <div className="dot-matrix text-[7px] mb-2 opacity-50 uppercase">
                         {msg.role === 'user' ? 'USER_PROMPT' : 'SCOUT_RESPONSE'}
                      </div>
                      <p className="text-[10px] leading-relaxed font-mono uppercase tracking-wide">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="boarding-pass border-l-2 border-l-atlas-cyan p-3 bg-atlas-bg2">
                       <div className="dot-matrix text-[7px] mb-2 opacity-50 animate-pulse">DECRYPTING_RESPONSE...</div>
                       <div className="flex gap-1.5">
                         {[0, 1, 2].map(j => (
                           <motion.div 
                             key={j}
                             animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                             transition={{ duration: 1, repeat: Infinity, delay: j * 0.2 }}
                             className="w-1 h-1 bg-atlas-cyan rounded-full"
                           />
                         ))}
                       </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-5 border-t border-atlas-border bg-atlas-bg2/90">
                <form onSubmit={handleChatSubmit} className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="INGEST_QUERY..."
                    className="input-retro w-full pr-12 text-[10px] uppercase placeholder:opacity-20"
                    disabled={chatLoading}
                  />
                  <button 
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="absolute right-3 top-2 text-atlas-amber hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </form>
                <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                   {['OPTIMIZE_ITINERARY', 'AUDIT_SPENDING', 'FLIGHT_STATUS', 'HIDDEN_GEMS'].map(chip => (
                     <button
                        key={chip}
                        onClick={() => setChatInput(chip)}
                        className="dot-matrix text-[6px] border border-atlas-border bg-atlas-bg px-3 py-1 hover:border-atlas-amber transition-colors uppercase whitespace-nowrap"
                     >
                       {chip}
                     </button>
                   ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
