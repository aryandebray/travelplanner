import { BrowserRouter, Routes, Route, Link, Navigate, useParams, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TripMembersProvider, useTripMembers } from './contexts/TripMembersContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import JoinTripPage from './pages/JoinTripPage';
import ItineraryPage from './pages/ItineraryPage';
import ExpensesPage from './pages/ExpensesPage';
import CalendarPage from './pages/CalendarPage';
import RecommendationsPage from './pages/RecommendationsPage';
import ChatPage from './pages/ChatPage';
import { LogOut, Globe, Map, DollarSign, CalendarDays, Sparkles, MessageCircle, Home as HomeIcon, UserPlus, X, Copy, Check, Loader2, Send, Pencil, User, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const PageWrapper = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="w-full h-full"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
};

const navItems = [
  { label: 'Itinerary', icon: Map, path: 'itinerary' },
  { label: 'Expenses', icon: DollarSign, path: 'expenses' },
  { label: 'Calendar', icon: CalendarDays, path: 'calendar' },
  { label: 'Recommendations', icon: Sparkles, path: 'recommendations' },
  { label: 'Chat', icon: MessageCircle, path: 'chat' },
];

function InviteModal({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { members, getMemberName, updateNickname, addGuestMember, removeGuestMember } = useTripMembers();
  const [tab, setTab] = useState<'invite' | 'members'>('invite');
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [guestNickname, setGuestNickname] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestSuccess, setGuestSuccess] = useState(false);
  const [removingGuest, setRemovingGuest] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('trips').select('invite_code').eq('id', tripId).single()
      .then(({ data }) => {
        if (data?.invite_code) {
          setInviteLink(`${window.location.origin}/join/${data.invite_code}`);
        }
      });
  }, [tripId]);

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (trimmed && trimmed.includes('@') && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed]);
      setEmailInput('');
    }
  };

  const removeEmail = (e: string) => setEmails(emails.filter(x => x !== e));

  const handleEmailInvite = async () => {
    if (emails.length === 0) return;
    setInviting(true);
    try {
      for (const email of emails) {
        const { error } = await supabase.from('trip_invites').insert({
          trip_id: tripId,
          invited_email: email,
          invited_by: user?.id,
          status: 'pending'
        });
        if (error) console.error(`Failed to invite ${email}:`, error);
      }
      setInviteSuccess(true);
      setEmails([]);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to send invites');
    } finally {
      setInviting(false);
    }
  };

  const handleAddGuest = async () => {
    if (!guestNickname.trim()) return;
    setAddingGuest(true);
    try {
      await addGuestMember(guestNickname.trim());
      setGuestNickname('');
      setGuestSuccess(true);
      setTimeout(() => setGuestSuccess(false), 3000);
    } catch {
      alert('Failed to add guest member');
    } finally {
      setAddingGuest(false);
    }
  };

  const handleRemoveGuest = async (guestUserId: string) => {
    setRemovingGuest(guestUserId);
    try {
      await removeGuestMember(guestUserId);
    } catch {
      alert('Failed to remove guest');
    } finally {
      setRemovingGuest(null);
    }
  };

  const handleNicknameSave = async (userId: string) => {
    try {
      await updateNickname(userId, nicknameInput);
      setEditingNickname(null);
      setNicknameInput('');
    } catch {
      alert('Failed to update nickname');
    }
  };

  const startEditNickname = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    setNicknameInput(member?.nickname || '');
    setEditingNickname(userId);
  };

  const realMembers = members.filter(m => !m.is_guest);
  const guestMembers = members.filter(m => m.is_guest);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-card w-full max-w-lg overflow-hidden border border-white/10 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent-cyan" /> Trip Members
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-5 gap-1 shrink-0">
          <button onClick={() => setTab('invite')} className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${tab === 'invite' ? 'border-accent-cyan text-accent-cyan' : 'border-transparent text-slate-400 hover:text-white'}`}>
            Invite
          </button>
          <button onClick={() => setTab('members')} className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px flex items-center gap-1.5 ${tab === 'members' ? 'border-accent-violet text-accent-violet' : 'border-transparent text-slate-400 hover:text-white'}`}>
            Members <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{members.length}</span>
          </button>
        </div>

        <div className="overflow-y-auto p-5 flex-1">
          {tab === 'invite' && (
            <div className="space-y-6">
              {/* Add by Nickname (Guest) */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Add Guests
                </h3>
                <p className="text-xs text-slate-500 mb-3">Add someone who doesn't have an account. They'll appear as a guest member in the trip.</p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={guestNickname}
                    onChange={e => setGuestNickname(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddGuest(); } }}
                    placeholder="e.g. Jordan, Mom, Roommate..."
                    className="glass-input text-sm flex-1"
                    maxLength={50}
                  />
                  <button
                    type="button"
                    onClick={handleAddGuest}
                    disabled={!guestNickname.trim() || addingGuest}
                    className="px-4 py-2 btn-gradient text-sm flex items-center gap-1.5 disabled:opacity-30"
                  >
                    {addingGuest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5" /> Add</>}
                  </button>
                </div>
                {guestSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-emerald-400 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Guest member added successfully!
                  </motion.div>
                )}
                {guestMembers.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {guestMembers.map(g => (
                      <div key={g.user_id} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                            <User className="w-3 h-3 text-amber-400" />
                          </div>
                          <span className="text-xs text-slate-300 font-medium">{g.nickname}</span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/15 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">Guest</span>
                        </div>
                        <button
                          onClick={() => handleRemoveGuest(g.user_id)}
                          disabled={removingGuest === g.user_id}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Remove guest"
                        >
                          {removingGuest === g.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-white/5" />

              {/* Shareable Link */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Shareable Link</h3>
                <p className="text-xs text-slate-500 mb-3">Anyone with this link can join the trip after logging in.</p>
                <div className="flex gap-2">
                  <input type="text" readOnly value={inviteLink} className="glass-input text-xs font-mono flex-1 truncate" />
                  <button onClick={copyLink} className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${linkCopied ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'btn-gradient'}`}>
                    {linkCopied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Email Invite */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Invite by Email</h3>
                <p className="text-xs text-slate-500 mb-3">Add email addresses of people who have Atlas accounts.</p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                    placeholder="friend@example.com"
                    className="glass-input text-sm flex-1"
                  />
                  <button type="button" onClick={addEmail} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm">
                    Add
                  </button>
                </div>

                {emails.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {emails.map(email => (
                      <div key={email} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg px-3 py-2">
                        <span className="text-xs text-slate-300 font-mono">{email}</span>
                        <button onClick={() => removeEmail(email)} className="text-slate-500 hover:text-red-400 transition-all"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}

                {inviteSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-emerald-400 mb-3 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Invitations sent successfully!
                  </div>
                )}

                <button
                  onClick={handleEmailInvite}
                  disabled={emails.length === 0 || inviting}
                  className="btn-gradient w-full py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-30"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Invites ({emails.length})</>}
                </button>
              </div>
            </div>
          )}

          {tab === 'members' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-4">Manage trip members and assign nicknames. These appear everywhere in this trip.</p>

              {/* Real Members */}
              {realMembers.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-2">Members</div>
                  {realMembers.map(m => (
                    <div key={m.user_id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(m.nickname || getMemberName(m.user_id)).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          {editingNickname === m.user_id ? (
                            <div className="flex gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={nicknameInput}
                                onChange={e => setNicknameInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleNicknameSave(m.user_id); if (e.key === 'Escape') setEditingNickname(null); }}
                                placeholder="Enter nickname"
                                className="glass-input text-xs py-1.5 flex-1"
                              />
                              <button onClick={() => handleNicknameSave(m.user_id)} className="px-2 py-1 bg-accent-cyan/10 text-accent-cyan rounded-lg text-xs hover:bg-accent-cyan/20 transition-all">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm font-medium text-white truncate">{getMemberName(m.user_id)}</div>
                              <div className="text-[10px] text-slate-500 capitalize">{m.role} {m.user_id === user?.id ? '(you)' : ''}</div>
                            </>
                          )}
                        </div>
                      </div>
                      {editingNickname !== m.user_id && (
                        <button onClick={() => startEditNickname(m.user_id)} className="p-1.5 text-slate-500 hover:text-accent-cyan hover:bg-accent-cyan/10 rounded-lg transition-all shrink-0" title="Edit nickname">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Guest Members */}
              {guestMembers.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-2 mt-5 flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Guests (No Account)
                  </div>
                  {guestMembers.map(m => (
                    <div key={m.user_id} className="bg-white/5 border border-amber-500/10 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
                          {(m.nickname || 'G').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          {editingNickname === m.user_id ? (
                            <div className="flex gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={nicknameInput}
                                onChange={e => setNicknameInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleNicknameSave(m.user_id); if (e.key === 'Escape') setEditingNickname(null); }}
                                placeholder="Enter nickname"
                                className="glass-input text-xs py-1.5 flex-1"
                              />
                              <button onClick={() => handleNicknameSave(m.user_id)} className="px-2 py-1 bg-accent-cyan/10 text-accent-cyan rounded-lg text-xs hover:bg-accent-cyan/20 transition-all">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                                {m.nickname || 'Guest'}
                                <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/15 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">Guest</span>
                              </div>
                              <div className="text-[10px] text-slate-500">Nickname only — no account</div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {editingNickname !== m.user_id && (
                          <button onClick={() => startEditNickname(m.user_id)} className="p-1.5 text-slate-500 hover:text-accent-cyan hover:bg-accent-cyan/10 rounded-lg transition-all" title="Edit nickname">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveGuest(m.user_id)}
                          disabled={removingGuest === m.user_id}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Remove guest"
                        >
                          {removingGuest === m.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function MobileMenu({ isOpen, onClose, tripId, navItems }: { isOpen: boolean; onClose: () => void; tripId: string; navItems: any[] }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] md:hidden"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-[280px] glass-sidebar z-[70] p-6 md:hidden flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <Link to="/" onClick={onClose} className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">Atlas</span>
              </Link>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              <Link to="/" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 font-medium transition-all">
                <HomeIcon className="w-5 h-5 text-accent-cyan" /> Dashboard
              </Link>
              
              <div className="pt-6 pb-2 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                Trip Menu
              </div>
              
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={`/trip/${tripId}/${item.path}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 font-medium transition-all"
                >
                  <item.icon className="w-5 h-5 text-accent-violet" /> {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TripLayout() {
  const { signOut, user } = useAuth();
  const { tripId } = useParams();
  const location = useLocation();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname.includes(path);
  
  return (
    <TripMembersProvider tripId={tripId || ''}>
      <div className="min-h-screen flex flex-col md:flex-row relative">
        {/* Aurora background */}
        <div className="aurora-bg" />
        <div className="aurora-blob-3" />

        {/* Desktop Sidebar */}
        <aside className="w-64 glass-sidebar hidden md:flex flex-col p-5 z-20 sticky top-0 h-screen shrink-0">
          <Link to="/" className="flex items-center gap-3 mb-10 px-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shadow-lg shadow-accent-cyan/20 group-hover:shadow-accent-cyan/40 transition-shadow">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Atlas</span>
          </Link>

          <nav className="flex-1 space-y-1">
            <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
              <HomeIcon className="w-4 h-4" /> Dashboard
            </Link>
            
            {tripId && (
              <>
                <div className="pt-6 pb-2 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                  Trip Menu
                </div>
                {navItems.map((item) => (
                  <Link 
                    key={item.path} 
                    to={`/trip/${tripId}/${item.path}`}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive(item.path) 
                        ? 'text-accent-cyan bg-accent-cyan/10 border-l-2 border-accent-cyan shadow-sm shadow-accent-cyan/5' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4 h-4" /> {item.label}
                  </Link>
                ))}
                <div className="pt-6 px-1">
                  <button onClick={() => setInviteModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-accent-cyan bg-accent-cyan/5 border border-accent-cyan/20 hover:bg-accent-cyan/10 hover:border-accent-cyan/30 transition-all">
                    <UserPlus className="w-4 h-4" /> Invite Friends
                  </button>
                </div>
              </>
            )}
          </nav>
          
          {/* User / Logout */}
          <div className="mt-auto pt-4 border-t border-white/5">
            <div className="px-4 py-2 text-xs text-slate-500 truncate mb-1">
              {user?.email}
            </div>
            <button 
              onClick={signOut}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all font-medium text-sm"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 mobile-header px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 text-slate-300 hover:text-white transition-colors"
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className="w-full h-0.5 bg-current rounded-full" />
              <span className="w-2/3 h-0.5 bg-current rounded-full" />
              <span className="w-full h-0.5 bg-current rounded-full" />
            </div>
          </button>
          
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shadow-lg shadow-accent-cyan/20">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Atlas</span>
          </Link>

          <button onClick={() => setInviteModalOpen(true)} className="p-2 -mr-2 text-accent-cyan hover:bg-accent-cyan/10 rounded-full transition-all">
            <UserPlus className="w-5 h-5" />
          </button>
        </header>

        <MobileMenu 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)} 
          tripId={tripId || ''} 
          navItems={navItems} 
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden relative z-10 flex flex-col min-h-[calc(100vh-60px)] md:min-h-screen">
          <PageWrapper />
        </main>

        {/* Invite Modal */}
        <AnimatePresence>
          {inviteModalOpen && tripId && (
            <InviteModal tripId={tripId} onClose={() => setInviteModalOpen(false)} />
          )}
        </AnimatePresence>
      </div>
    </TripMembersProvider>
  );
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-cyan absolute" />
          <div className="animate-ping rounded-full h-12 w-12 border-2 border-accent-cyan/20 absolute" />
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/join/:inviteCode" element={<JoinTripPage />} />
          
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          
          <Route path="/trip/:tripId" element={<ProtectedRoute><TripLayout /></ProtectedRoute>}>
            <Route path="itinerary" element={<ItineraryPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="recommendations" element={<RecommendationsPage />} />
            <Route path="chat" element={<ChatPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
