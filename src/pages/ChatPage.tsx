import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTripMembers } from '../contexts/TripMembersContext';
import { format } from 'date-fns';
import { Send, Pin, MessageSquare, BarChart2, Plus, X, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
};

type PollOption = {
  id: string;
  option_text: string;
  votes: number;
  userVoted: boolean;
};

type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  created_at: string;
};

export default function ChatPage() {
  const { tripId } = useParams();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [view, setView] = useState<'chat' | 'polls'>('chat');
  const [loading, setLoading] = useState(true);
  
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionsInput, setPollOptionsInput] = useState(['', '']);
  const [suggesting, setSuggesting] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);

  useEffect(() => { fetchData(); setupRealtime(); }, [tripId]);

  useEffect(() => {
    if (view === 'chat') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view]);

  const fetchData = async () => {
    if (!tripId || !user) return;
    try {
      const { data: msgs } = await supabase.from('messages').select('*').eq('trip_id', tripId).order('created_at', { ascending: true });
      if (msgs) setMessages(msgs);
      const { data: pollsData } = await supabase.from('polls').select('id, question, created_at').eq('trip_id', tripId).order('created_at', { ascending: false });
      if (pollsData) {
        const fullPolls: Poll[] = await Promise.all(pollsData.map(async p => {
          const { data: opts } = await supabase.from('poll_options').select('*').eq('poll_id', p.id);
          const { data: votes } = await supabase.from('poll_votes').select('poll_option_id, user_id').in('poll_option_id', (opts || []).map(o => o.id));
          const optionsWithVotes = (opts || []).map(o => {
            const opVotes = (votes || []).filter(v => v.poll_option_id === o.id);
            return { id: o.id, option_text: o.option_text, votes: opVotes.length, userVoted: opVotes.some(v => v.user_id === user.id) };
          });
          return { ...p, options: optionsWithVotes } as Poll;
        }));
        setPolls(fullPolls);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const setupRealtime = () => {
    if (!tripId) return;
    const msgSub = supabase.channel(`public:messages:trip_id=eq.${tripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `trip_id=eq.${tripId}` }, payload => setMessages(prev => [...prev, payload.new as Message]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `trip_id=eq.${tripId}` }, payload => setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m)))
      .subscribe();
    const voteSub = supabase.channel(`public:poll_votes_refresh`).on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(msgSub); supabase.removeChannel(voteSub); };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !tripId || !user) return;
    const msg = newMessage;
    setNewMessage('');
    try { await supabase.from('messages').insert({ trip_id: tripId, user_id: user.id, content: msg, is_pinned: false }); }
    catch (err) { console.error(err); }
  };

  const togglePin = async (msg: Message) => {
    try { await supabase.from('messages').update({ is_pinned: !msg.is_pinned }).eq('id', msg.id); }
    catch (err) { console.error(err); }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return;
    try {
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;
      await supabase.from('poll_votes').delete().in('poll_option_id', poll.options.map(o => o.id)).eq('user_id', user.id);
      await supabase.from('poll_votes').insert({ poll_option_id: optionId, user_id: user.id });
    } catch (err) { console.error(err); }
  };

  const suggestPollsWithAI = async () => {
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-polls', { body: {} });
      if (error) throw error;
      if (data?.question && data?.options) { setPollQuestion(data.question); setPollOptionsInput(data.options); }
    } catch (err) { console.error(err); alert('Could not generate suggestions.'); }
    finally { setSuggesting(false); }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || !tripId || !user) return;
    const validOptions = pollOptionsInput.filter(o => o.trim() !== '');
    if (validOptions.length < 2) { alert('At least 2 options needed.'); return; }
    setCreatingPoll(true);
    try {
      const { data: pollData, error: pollError } = await supabase.from('polls').insert({ trip_id: tripId, question: pollQuestion }).select().single();
      if (pollError) throw pollError;
      const { error: optError } = await supabase.from('poll_options').insert(validOptions.map(opt => ({ poll_id: pollData.id, option_text: opt })));
      if (optError) throw optError;
      await supabase.from('messages').insert({ trip_id: tripId, user_id: user.id, content: `📊 New Poll: ${pollQuestion}`, is_pinned: false });
      setIsPollModalOpen(false);
      setPollQuestion('');
      setPollOptionsInput(['', '']);
      fetchData();
    } catch (err) { console.error(err); alert('Failed to create poll'); }
    finally { setCreatingPoll(false); }
  };

  const { getMemberName } = useTripMembers();

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent-cyan" /></div>;

  const pinnedMessages = messages.filter(m => m.is_pinned);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="glass-card overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 6rem)' }}>
        {/* Header Tabs */}
        <div className="flex border-b border-white/5 bg-white/[0.02] p-2 gap-2 shrink-0">
          <button
            onClick={() => setView('chat')}
            className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center transition-all text-sm ${view === 'chat' ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <MessageSquare className="w-4 h-4 mr-2" /> Group Chat
          </button>
          <button
            onClick={() => setView('polls')}
            className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center transition-all text-sm ${view === 'polls' ? 'bg-accent-violet/10 text-accent-violet' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <BarChart2 className="w-4 h-4 mr-2" /> Polls
          </button>
        </div>

        {view === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Pinned */}
            {pinnedMessages.length > 0 && (
              <div className="bg-accent-cyan/5 border-b border-white/5 p-2.5 shrink-0 overflow-x-auto flex gap-2 items-center">
                <Pin className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                {pinnedMessages.map(pm => (
                  <div key={pm.id} className="text-xs bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg flex-shrink-0 max-w-xs truncate">
                    <span className="font-semibold text-accent-cyan mr-1.5">{getMemberName(pm.user_id)}:</span>
                    <span className="text-slate-400">{pm.content}</span>
                    <button onClick={() => togglePin(pm)} className="ml-2 text-slate-500 hover:text-red-400"><X className="w-3 h-3 inline" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <MessageSquare className="w-10 h-10 mb-3 text-slate-600" />
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.user_id === user?.id;
                  const showName = idx === 0 || messages[idx - 1].user_id !== msg.user_id;
                  return (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showName && <span className="text-[10px] text-slate-500 mb-1 ml-1 font-medium">{getMemberName(msg.user_id)}</span>}
                      <div className="flex items-center group max-w-[80%]">
                        {!isMe && (
                          <button onClick={() => togglePin(msg)} className={`p-1 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.is_pinned ? 'text-accent-cyan opacity-100' : 'text-slate-600 hover:bg-white/5'}`}>
                            <Pin className="w-3 h-3" />
                          </button>
                        )}
                        <div className={`px-3.5 py-2 rounded-2xl text-sm ${isMe ? 'bg-gradient-to-r from-accent-cyan to-accent-violet text-white rounded-br-sm' : 'bg-white/5 border border-white/5 text-slate-300 rounded-bl-sm'}`}>
                          {msg.content}
                        </div>
                        {isMe && (
                          <button onClick={() => togglePin(msg)} className={`p-1 rounded-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.is_pinned ? 'text-accent-cyan opacity-100' : 'text-slate-600 hover:bg-white/5'}`}>
                            <Pin className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-600 mt-0.5">{format(new Date(msg.created_at), 'h:mm a')}</span>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/5 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Message the group..."
                  className="glass-input py-2.5 text-sm flex-1 rounded-full"
                />
                <button type="submit" disabled={!newMessage.trim()} className="btn-gradient p-2.5 rounded-full disabled:opacity-30">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {view === 'polls' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">Group Decisions</h2>
              <button onClick={() => setIsPollModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-accent-cyan bg-accent-cyan/5 border border-accent-cyan/10 rounded-lg hover:bg-accent-cyan/10 transition-all">
                <Plus className="w-3.5 h-3.5" /> Create Poll
              </button>
            </div>

            {polls.length === 0 ? (
              <div className="text-center py-16 glass-card">
                <BarChart2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <h3 className="text-lg font-bold text-white">No active polls</h3>
                <p className="text-slate-400 text-sm">Ask the group to vote on dates, places, or budgets.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map(poll => {
                  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                  return (
                    <div key={poll.id} className="glass-card p-5">
                      <h3 className="text-base font-bold text-white mb-4">{poll.question}</h3>
                      <div className="space-y-2">
                        {poll.options.map(opt => {
                          const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                          return (
                            <div
                              key={opt.id}
                              onClick={() => handleVote(poll.id, opt.id)}
                              className={`relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all ${opt.userVoted ? 'border-accent-cyan/30 bg-accent-cyan/5' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'}`}
                            >
                              <motion.div
                                className={`absolute top-0 left-0 bottom-0 ${opt.userVoted ? 'bg-accent-cyan/10' : 'bg-white/5'} z-0`}
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                              />
                              <div className="relative z-10 flex justify-between items-center">
                                <span className={`font-medium text-sm ${opt.userVoted ? 'text-accent-cyan' : 'text-slate-300'}`}>{opt.option_text}</span>
                                <span className="text-xs font-bold text-slate-500">{percent}% ({opt.votes})</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 text-[10px] text-slate-500 text-right">{totalVotes} total votes</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Poll Creation Modal */}
      <AnimatePresence>
        {isPollModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card w-full max-w-md overflow-hidden border border-white/10">
              <div className="flex justify-between items-center p-5 border-b border-white/5">
                <h2 className="text-lg font-bold text-white">New Poll</h2>
                <button onClick={() => setIsPollModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreatePoll} className="p-5 space-y-5">
                <div>
                  <label className="text-xs font-medium text-slate-400 flex justify-between items-center mb-1.5 uppercase tracking-wider">
                    <span>Question</span>
                    <button type="button" onClick={suggestPollsWithAI} disabled={suggesting} className="text-[10px] text-accent-cyan hover:text-accent-cyan/80 flex items-center bg-accent-cyan/5 px-2 py-0.5 rounded-md border border-accent-cyan/10">
                      {suggesting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />} AI Suggestion
                    </button>
                  </label>
                  <input required type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Where should we eat on Friday?" className="glass-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Options</label>
                  <div className="space-y-2">
                    {pollOptionsInput.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input required={i < 2} type="text" value={opt} onChange={e => { const n = [...pollOptionsInput]; n[i] = e.target.value; setPollOptionsInput(n); }} placeholder={`Option ${i + 1}`} className="glass-input text-sm" />
                        {i >= 2 && <button type="button" onClick={() => setPollOptionsInput(pollOptionsInput.filter((_, idx) => idx !== i))} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><X className="w-4 h-4" /></button>}
                      </div>
                    ))}
                  </div>
                  {pollOptionsInput.length < 5 && (
                    <button type="button" onClick={() => setPollOptionsInput([...pollOptionsInput, ''])} className="mt-2 text-xs text-accent-cyan font-medium hover:underline flex items-center">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
                    </button>
                  )}
                </div>
                <button type="submit" disabled={creatingPoll} className="btn-gradient w-full py-3 flex justify-center items-center text-sm">
                  {creatingPoll ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Poll"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
