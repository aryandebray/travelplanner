import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Bot } from 'lucide-react';

type ChatMessage = { role: 'user' | 'ai'; content: string };

type ScoutPanelProps = {
  /** Context string sent to the AI so it knows what page the user is on */
  context: string;
  /** Optional extra data (e.g. expenses JSON, calendar data) sent with each message */
  pageData?: any;
  /** Optional callback when the AI returns structured data (e.g. a chart config) */
  onStructuredResponse?: (data: any) => void;
  /** Initial greeting message */
  greeting?: string;
  /** Height of the panel */
  height?: string;
};

export default function ScoutPanel({ context, pageData, onStructuredResponse, greeting, height = '580px' }: ScoutPanelProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: greeting || "Hey! I'm Scout, your AI co-pilot. Ask me anything about this page!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          history: chatMessages,
          context,
          pageData: pageData || null
        }
      });
      if (error) throw error;
      
      setChatMessages(prev => [...prev, { role: 'ai', content: data.message }]);
      
      // If the AI returned structured data (e.g. chart config), forward it
      if (data.structured && onStructuredResponse) {
        onStructuredResponse(data.structured);
      }
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I ran into an error. Please try again!' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="glass-card overflow-hidden flex flex-col" style={{ height }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-accent-cyan/20 to-accent-violet/20 p-4 flex items-center gap-2.5 border-b border-white/5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Scout</h3>
          <p className="text-[10px] text-slate-400">AI Co-pilot</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-accent-cyan to-accent-violet text-white rounded-br-sm'
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
                <div className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <form onSubmit={handleChatSubmit} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Ask Scout anything..."
            className="glass-input py-2 text-xs flex-1"
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="btn-gradient p-2 rounded-lg disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
