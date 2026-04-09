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
import { Map, DollarSign, CalendarDays, Sparkles, X, UserPlus } from 'lucide-react';
import { useState, useEffect, memo } from 'react';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import ScoutFAB from './components/ScoutFAB';
import AuraBackground from './components/AuraBackground';
import Sidebar from './components/Sidebar';

/* ────────────────────────────────────────────────────
   Page transition wrapper — fast, GPU-only animation
   ──────────────────────────────────────────────────── */
const PageWrapper = memo(() => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full h-full"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
});

/* ────────────────────────────────────────────────────
   Trip tab navigation items
   ──────────────────────────────────────────────────── */
const navItems = [
  { label: 'Itinerary', icon: Map, path: 'itinerary' },
  { label: 'Expenses', icon: DollarSign, path: 'expenses' },
  { label: 'Calendar', icon: CalendarDays, path: 'calendar' },
  { label: 'Recommendations', icon: Sparkles, path: 'recommendations' },
];

/* ────────────────────────────────────────────────────
   Invite Modal — Boarding Pass styled
   ──────────────────────────────────────────────────── */
function InviteModal({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const { members, getMemberName, addGuestMember, removeGuestMember } = useTripMembers();
  const [tab, setTab] = useState<'invite' | 'members'>('invite');
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [guestNickname, setGuestNickname] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);

  useEffect(() => {
    const fetchInviteLink = async () => {
      const { data } = await supabase.from('trips').select('invite_code').eq('id', tripId).single();
      if (data?.invite_code) {
        setInviteLink(`${window.location.origin}/join/${data.invite_code}`);
      }
    };
    fetchInviteLink();
  }, [tripId]);

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleAddGuest = async () => {
    if (!guestNickname.trim()) return;
    setAddingGuest(true);
    try {
      await addGuestMember(guestNickname);
      setGuestNickname('');
    } catch (err) {
      console.error(err);
    } finally {
      setAddingGuest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(16,19,27,0.8)', backdropFilter: 'blur(8px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }} className="boarding-pass w-full max-w-lg shadow-2xl">
        <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setTab('invite')} className={`flex-1 p-4 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${tab === 'invite' ? 'text-atlas-amber' : 'text-atlas-muted'}`} style={{ fontFamily: 'Space Grotesk', borderBottom: tab === 'invite' ? '2px solid var(--amber)' : '2px solid transparent' }}>Invite_Protocol</button>
          <button onClick={() => setTab('members')} className={`flex-1 p-4 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${tab === 'members' ? 'text-atlas-amber' : 'text-atlas-muted'}`} style={{ fontFamily: 'Space Grotesk', borderBottom: tab === 'members' ? '2px solid var(--amber)' : '2px solid transparent' }}>Manifest_Members</button>
          <button onClick={onClose} className="p-4 text-atlas-muted hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {tab === 'invite' ? (
            <div className="space-y-6">
              <div>
                <label className="dot-matrix text-[8px] mb-2 block opacity-50">DIRECT_VECTOR_KEY</label>
                <div className="flex gap-2">
                  <input readOnly value={inviteLink} className="input-retro flex-1 text-[10px] lowercase" />
                  <button onClick={copyLink} className="btn-amber px-4">{linkCopied ? 'COPIED' : 'COPY'}</button>
                </div>
              </div>

              <div className="perforation" />

              <div>
                <label className="dot-matrix text-[8px] mb-2 block opacity-50">GUEST_INGESTION_ID (NICKNAME)</label>
                <div className="flex gap-2">
                  <input value={guestNickname} onChange={e => setGuestNickname(e.target.value)} placeholder="GUEST_SIG_01" className="input-retro flex-1 uppercase" />
                  <button onClick={handleAddGuest} disabled={addingGuest} className="btn-amber px-4">{addingGuest ? 'INGESTING...' : 'ADD_NODE'}</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
              {members.map(m => (
                <div key={m.user_id} className="p-3 rounded-lg flex justify-between items-center" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <span className="text-[10px] font-bold text-white uppercase" style={{ fontFamily: 'Space Grotesk' }}>{getMemberName(m.user_id)}</span>
                  {m.is_guest && (
                    <button onClick={() => removeGuestMember(m.user_id)} className="text-[8px] text-atlas-red border border-atlas-red/30 px-2 py-0.5 rounded hover:bg-atlas-red/10 transition-colors">DEACTIVATE</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   Main Layout — Auth guard + ambient backdrop
   ──────────────────────────────────────────────────── */
const MainLayout = memo(() => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <AuraBackground />
      <Outlet />
      <ScoutFAB context="Global" />
    </div>
  );
});

/* ────────────────────────────────────────────────────
   Trip Layout — Sidebar + Tab Bar + Content
   ──────────────────────────────────────────────────── */
const TripLayout = memo(() => {
  const { tripId } = useParams();
  const location = useLocation();
  const [showInvite, setShowInvite] = useState(false);

  return (
    <TripMembersProvider tripId={tripId!}>
      <div className="layout-shell flex h-screen overflow-hidden relative" style={{ background: 'var(--bg)' }}>
        <Sidebar tripId={tripId} />

        <div className="h-full flex flex-col flex-1 relative z-10">
          {/* Top Tab Bar — Frosted Terminal */}
          <header className="tab-bar h-16 flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-1 h-full">
              {navItems.map((item) => {
                const path = `/trip/${tripId}/${item.path}`;
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={item.path}
                    to={path}
                    className={`h-full flex items-center gap-2.5 px-4 transition-colors duration-150 relative ${
                      isActive ? 'text-white' : 'text-atlas-muted hover:text-atlas-text'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-atlas-amber' : ''}`} strokeWidth={1.5} />
                    <span className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ fontFamily: 'Space Grotesk' }}>
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                        style={{ background: 'var(--amber)', boxShadow: '0 0 10px rgba(240,160,80,0.4)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <button
              onClick={() => setShowInvite(true)}
              className="btn-cyan flex items-center gap-2"
            >
              <UserPlus className="w-3.5 h-3.5" /> IN_VITE
            </button>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
            <PageWrapper />
          </div>

          {showInvite && <InviteModal tripId={tripId!} onClose={() => setShowInvite(false)} />}
        </div>
      </div>
    </TripMembersProvider>
  );
});

/* ────────────────────────────────────────────────────
   App Router
   ──────────────────────────────────────────────────── */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trip/:tripId" element={<TripLayout />}>
              <Route path="itinerary" element={<ItineraryPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="recommendations" element={<RecommendationsPage />} />
              <Route index element={<Navigate to="itinerary" replace />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="/join/:code" element={<JoinTripPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
