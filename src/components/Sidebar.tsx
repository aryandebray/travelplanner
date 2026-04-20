import { memo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Calendar as CalendarIcon, DollarSign, Map, MessageSquare, Settings, LogOut, X, Edit2, Check, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTripMembers } from '../contexts/TripMembersContext';

interface SidebarProps {
  tripId?: string;
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ tripId, isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Safe since Sidebar is only rendered inside TripLayout which provides this context
  const { members, getMemberName, updateNickname } = useTripMembers();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleSaveNickname = async (userId: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await updateNickname(userId, editName);
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { icon: Map, label: 'Dashboard', path: `/dashboard` },
    { icon: Compass, label: 'Itinerary', path: `/trip/${tripId}/itinerary` },
    { icon: DollarSign, label: 'Expenses', path: `/trip/${tripId}/expenses` },
    { icon: CalendarIcon, label: 'Calendar', path: `/trip/${tripId}/calendar` },
    { icon: MessageSquare, label: 'Recommendations', path: `/trip/${tripId}/recommendations` },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`sidebar-fixed fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative`}>
        {/* Close Button Mobile */}
        <button 
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 text-atlas-muted hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      {/* Logo */}
      <div className="p-6 pb-2 flex items-center gap-3">
        <img src="/atlas-logo.png" alt="Atlas" className="w-9 h-9 rounded-lg object-cover" />
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight uppercase"
              style={{ fontFamily: 'Space Grotesk' }}>
            ATLAS
          </h1>
          <div className="dot-matrix text-[7px] opacity-40">FLIGHT_DECK_V1.0</div>
        </div>
      </div>

      {/* Nav Section */}
      <nav className="flex-1 px-3 mt-6 space-y-1">
        <div className="dot-matrix text-[7px] mb-3 px-3 opacity-40">NAVIGATION</div>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path.includes('itinerary') && location.pathname.includes('itinerary'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ${
                isActive
                  ? 'bg-atlas-amber/10 text-atlas-amber2'
                  : 'text-atlas-muted hover:text-atlas-text hover:bg-white/[0.03]'
              }`}
              onClick={() => { if(window.innerWidth < 768) onClose(); }}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-atlas-amber' : ''}`} strokeWidth={1.5} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{ fontFamily: 'Space Grotesk' }}>
                {item.label}
              </span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-atlas-amber shadow-glow-amber" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Crew Manifest Section */}
      <div className="px-3 mt-6">
        <div className="dot-matrix text-[7px] mb-3 px-3 opacity-40">CREW_MANIFEST</div>
        <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
          {members.map(m => {
            const isMe = m.user_id === user?.id;
            const isEditing = editingId === m.user_id;

            return (
              <div key={m.user_id} className="flex flex-col px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-atlas-cyan" />
                    {isEditing ? (
                      <input 
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveNickname(m.user_id)}
                        className="bg-transparent border-b border-atlas-amber text-[10px] text-white focus:outline-none w-20"
                        placeholder="NICKNAME"
                      />
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-white truncate max-w-[90px]">
                        {getMemberName(m.user_id)}
                      </span>
                    )}
                  </div>
                  
                  {isMe && !isEditing ? (
                    <button onClick={() => { setEditingId(m.user_id); setEditName(getMemberName(m.user_id)); }} className="text-atlas-muted hover:text-white">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  ) : isEditing ? (
                    <button onClick={() => handleSaveNickname(m.user_id)} className="text-atlas-amber hover:text-white">
                      <Check className="w-3 h-3" />
                    </button>
                  ) : null}
                </div>
                {m.role === 'owner' && <span className="text-[7px] text-atlas-amber dot-matrix mt-1">CAPTAIN</span>}
                {m.is_guest && <span className="text-[7px] text-atlas-muted dot-matrix mt-1">OFFLINE_GUEST</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* System Status */}
      <div className="p-3 mt-auto space-y-1">
        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-atlas-muted hover:text-atlas-text transition-colors rounded-lg hover:bg-white/[0.03]">
          <Settings className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ fontFamily: 'Space Grotesk' }}>Settings</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-atlas-muted hover:text-atlas-red transition-colors rounded-lg hover:bg-atlas-red/[0.05]"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ fontFamily: 'Space Grotesk' }}>Log_Out</span>
        </button>

        <div className="boarding-pass p-3 mt-2">
          <div className="dot-matrix text-[7px] mb-1 opacity-50">SYSTEM_STATUS</div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-atlas-green" />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: 'DM Mono', color: 'var(--cyan)' }}>
              ONLINE_OK
            </span>
          </div>
          <div className="dot-matrix text-[6px] mt-1 opacity-30">v1.0.4</div>
        </div>
      </div>
    </aside>
    </>
  );
}

export default memo(Sidebar);
