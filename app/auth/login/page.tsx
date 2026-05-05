'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

const FEATURES = [
  { icon: '🎟️', text: 'Buy & manage tickets in one place' },
  { icon: '🔔', text: 'Real-time event notifications' },
  { icon: '👑', text: 'Earn loyalty points on every purchase' },
  { icon: '🗺️', text: 'Discover events happening near you' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]   = useState('');
  const [password, setPassword]= useState('');
  const [showPw,   setShowPw]  = useState(false);
  const [loading,  setLoading] = useState(false);
  const [focused,  setFocused] = useState<string|null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    // Check role and redirect accordingly
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      toast.success('Welcome back! 🎉');
      router.push(profile?.role === 'organizer' || profile?.role === 'admin' ? '/dashboard' : '/');
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen page-offset flex" style={{ background: 'var(--bg)' }}>

      {/* ── LEFT BRAND PANEL (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden flex-col justify-between p-12 xl:p-16"
        style={{ background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 50%, #0d0d1a 100%)' }}>

        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(114,34,227,0.5), transparent 70%)' }} />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute bottom-[-5%] right-[-10%] w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,85,194,0.4), transparent 70%)' }} />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(44,196,234,0.3), transparent 70%)' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base"
              style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>FT</div>
            <span className="text-white font-black text-lg tracking-tight">Future Times Events</span>
          </Link>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
              Zimbabwe&apos;s premium<br />
              <span style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                event platform
              </span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">
              Discover, book, and experience the best events across Zimbabwe.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map((f, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3 text-white/80 text-sm font-medium">
                <span className="text-lg">{f.icon}</span>
                {f.text}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 text-white/30 text-xs">© 2026 Future Times Events · Harare, Zimbabwe</p>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 sm:px-12 xl:px-16 relative"
        style={{ background: 'var(--bg-secondary)' }}>

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 w-full">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
              style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>FT</div>
            <span className="font-black text-lg" style={{ color: 'var(--text)' }}>Future Times Events</span>
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md">

          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-black mb-2" style={{ color: 'var(--text)' }}>Welcome back</h1>
            <p style={{ color: 'var(--text-muted)' }}>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-bold" style={{ color: 'var(--text)' }}>Email address</label>
              <motion.div animate={{ boxShadow: focused === 'email' ? '0 0 0 3px rgba(114,34,227,0.15)' : '0 0 0 0px transparent' }}
                className="relative rounded-2xl overflow-hidden border transition-colors"
                style={{ borderColor: focused === 'email' ? 'var(--accent)' : 'var(--border)', background: 'var(--bg-card)' }}>
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-4 bg-transparent outline-none text-base"
                  style={{ color: 'var(--text)' }} />
              </motion.div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-bold" style={{ color: 'var(--text)' }}>Password</label>
              <motion.div animate={{ boxShadow: focused === 'password' ? '0 0 0 3px rgba(114,34,227,0.15)' : '0 0 0 0px transparent' }}
                className="relative rounded-2xl overflow-hidden border transition-colors"
                style={{ borderColor: focused === 'password' ? 'var(--accent)' : 'var(--border)', background: 'var(--bg-card)' }}>
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-4 bg-transparent outline-none text-base"
                  style={{ color: 'var(--text)' }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-100 opacity-60"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </motion.div>
            </div>

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition-all"
              style={{ background: loading ? 'var(--border)' : 'linear-gradient(135deg,#FF55C2,#7222E3)', boxShadow: loading ? 'none' : '0 8px 32px rgba(114,34,227,0.35)' }}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in…</> : <>Sign In <ArrowRight size={16} /></>}
            </motion.button>
          </form>

          <div className="mt-8 pt-8 border-t text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-bold hover:underline" style={{ color: 'var(--accent)' }}>
                Create one free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
