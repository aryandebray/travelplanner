import { memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Calendar as CalendarIcon, DollarSign, Map, MessageSquare, Settings, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  tripId?: string;
}

function Sidebar({ tripId }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const navItems = [
    { icon: Map, label: 'Dashboard', path: `/dashboard` },
    { icon: Compass, label: 'Itinerary', path: `/trip/${tripId}/itinerary` },
    { icon: DollarSign, label: 'Expenses', path: `/trip/${tripId}/expenses` },
    { icon: CalendarIcon, label: 'Calendar', path: `/trip/${tripId}/calendar` },
    { icon: MessageSquare, label: 'Recommendations', path: `/trip/${tripId}/recommendations` },
  ];

  return (
    <aside className="sidebar-fixed">
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
  );
}

export default memo(Sidebar);
