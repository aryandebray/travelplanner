import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const redirect = localStorage.getItem('atlas_redirect');
      if (redirect) {
        localStorage.removeItem('atlas_redirect');
        navigate(redirect);
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Left Panel — Branding ── */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative p-12" style={{ background: 'var(--bg)' }}>
        {/* Dot-matrix radar grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'radial-gradient(rgba(116,209,255,0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

        {/* Concentric rings */}
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{ border: '1px solid rgba(240,160,80,0.06)' }} />
        <div className="absolute w-[350px] h-[350px] rounded-full" style={{ border: '1px solid rgba(240,160,80,0.08)' }} />
        <div className="absolute w-[200px] h-[200px] rounded-full" style={{ border: '1px solid rgba(240,160,80,0.1)' }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center relative z-10"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <img src="/atlas-logo.png" alt="Atlas" className="w-16 h-16 rounded-xl object-cover" />
          </div>
          <h1 className="text-6xl font-bold text-white tracking-tight uppercase mb-3" style={{ fontFamily: 'Space Grotesk' }}>
            ATLAS
          </h1>
          <p className="text-sm uppercase tracking-[0.3em] mb-12" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>
            GROUP TRAVEL, REIMAGINED
          </p>

          <div className="flex gap-10 justify-center">
            {[
              { label: 'AI ITINERARIES', color: 'var(--amber)' },
              { label: 'GROUP SYNC', color: 'var(--cyan)' },
              { label: 'SMART PLANNING', color: 'var(--green)' },
            ].map(feat => (
              <div key={feat.label} className="flex flex-col items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: feat.color, boxShadow: `0 0 8px ${feat.color}` }} />
                <span className="dot-matrix text-[8px]">{feat.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="absolute bottom-6 left-6 dot-matrix text-[7px] opacity-20">SYSTEM_BOOT_v4.0</div>
      </div>

      {/* ── Right Panel — Auth Form ── */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-6 lg:p-12" style={{ background: 'var(--bg2)' }}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Tab Toggle */}
          <div className="flex mb-8 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setIsLogin(true)}
              className="flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
              style={{
                fontFamily: 'Space Grotesk',
                background: isLogin ? 'rgba(240,160,80,0.1)' : 'transparent',
                color: isLogin ? 'var(--amber)' : 'var(--muted)',
                borderBottom: isLogin ? '2px solid var(--amber)' : '2px solid transparent'
              }}
            >
              SIGN_IN
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className="flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
              style={{
                fontFamily: 'Space Grotesk',
                background: !isLogin ? 'rgba(240,160,80,0.1)' : 'transparent',
                color: !isLogin ? 'var(--amber)' : 'var(--muted)',
                borderBottom: !isLogin ? '2px solid var(--amber)' : '2px solid transparent'
              }}
            >
              REGISTER
            </button>
          </div>

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>ATLAS</h1>
            <p className="dot-matrix text-[8px] mt-1" style={{ color: 'var(--muted)' }}>GROUP TRAVEL, REIMAGINED</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(255,180,171,0.08)', color: 'var(--red)', border: '1px solid rgba(255,180,171,0.15)' }}>
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(90,216,138,0.08)', color: 'var(--green)', border: '1px solid rgba(90,216,138,0.15)' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-5">
            <div>
              <label className="dot-matrix block mb-2 text-[8px]">IDENTIFICATION_KEY</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted2)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-retro w-full pl-10"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="dot-matrix block mb-2 text-[8px]">ACCESS_CODE</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted2)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-retro w-full pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-amber w-full flex justify-center items-center gap-2 py-3"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'AUTHENTICATE' : 'INITIALIZE_ACCOUNT'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px dashed var(--muted2)', opacity: 0.4 }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[9px] uppercase" style={{ background: 'var(--bg2)', color: 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '0.15em' }}>OR</span>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={handleGoogleAuth}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                CONTINUE_WITH_GOOGLE
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <span className="text-[10px]" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>
              {isLogin ? "NO_ACCOUNT? " : "EXISTING_USER? "}
            </span>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-bold uppercase transition-colors"
              style={{ color: 'var(--cyan)', fontFamily: 'Space Grotesk', letterSpacing: '0.1em' }}
            >
              {isLogin ? 'REGISTER' : 'SIGN_IN'}
            </button>
          </div>

          <div className="mt-8 text-center dot-matrix text-[7px] opacity-30">
            ATLAS_TERMINAL_v4.0.1 · TLS_ENCRYPTED · SECTOR_SECURE
          </div>
        </motion.div>
      </div>
    </div>
  );
}
