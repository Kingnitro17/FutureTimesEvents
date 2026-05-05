'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string|null>(null);

  const strength = password.length >= 8 ? '#46FFAB' : password.length >= 6 ? '#FFBC73' : '#FF55C2';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success(`Welcome, ${name.split(' ')[0]}! 🎉`);
    router.push('/profile');
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="min-h-screen page-offset flex" style={{ background: 'var(--bg)' }}>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-16 sm:px-12 xl:px-16"
        style={{ background: 'var(--bg-secondary)' }}>
        <div className="lg:hidden mb-10 w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
              style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>FT</div>
            <span className="font-black text-lg" style={{ color: 'var(--text)' }}>Future Times Events</span>
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }} className="w-full max-w-md">

          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
              style={{ background: 'rgba(114,34,227,0.1)', color: 'var(--accent)', border: '1px solid rgba(114,34,227,0.2)' }}>
              <Sparkles size={12} /> Free forever · No credit card needed
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-2" style={{ color: 'var(--text)' }}>Create your account</h1>
            <p style={{ color: 'var(--text-muted)' }}>Join thousands discovering events across Zimbabwe</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {[
              { id: 'name', label: 'Full name', type: 'text', value: name, set: setName, icon: User, placeholder: 'Your full name' },
              { id: 'email', label: 'Email address', type: 'email', value: email, set: setEmail, icon: Mail, placeholder: 'you@example.com' },
            ].map(({ id, label, type, value, set, icon: Icon, placeholder }) => (
              <div key={id} className="space-y-2">
                <label className="text-sm font-bold" style={{ color: 'var(--text)' }}>{label}</label>
                <motion.div animate={{ boxShadow: focused === id ? '0 0 0 3px rgba(114,34,227,0.15)' : 'none' }}
                  className="relative rounded-2xl overflow-hidden border transition-colors"
                  style={{ borderColor: focused === id ? 'var(--accent)' : 'var(--border)', background: 'var(--bg-card)' }}>
                  <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input type={type} value={value} onChange={e => set(e.target.value)} required
                    onFocus={() => setFocused(id)} onBlur={() => setFocused(null)}
                    placeholder={placeholder}
                    className="w-full pl-11 pr-4 py-4 bg-transparent outline-none text-base"
                    style={{ color: 'var(--text)' }} />
                </motion.div>
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-sm font-bold" style={{ color: 'var(--text)' }}>Password</label>
              <motion.div animate={{ boxShadow: focused === 'pw' ? '0 0 0 3px rgba(114,34,227,0.15)' : 'none' }}
                className="relative rounded-2xl overflow-hidden border transition-colors"
                style={{ borderColor: focused === 'pw' ? 'var(--accent)' : 'var(--border)', background: 'var(--bg-card)' }}>
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-11 pr-12 py-4 bg-transparent outline-none text-base"
                  style={{ color: 'var(--text)' }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </motion.div>
              <div className="flex gap-1 mt-2">
                {[2,4,6,8].map(n => (
                  <div key={n} className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{ background: password.length >= n ? strength : 'var(--border)' }} />
                ))}
              </div>
            </div>

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base"
              style={{ background: loading ? 'var(--border)' : 'linear-gradient(135deg,#FF55C2,#7222E3)', boxShadow: loading ? 'none' : '0 8px 32px rgba(114,34,227,0.35)' }}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Creating…</> : <>Create Free Account <ArrowRight size={16} /></>}
            </motion.button>

            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              By signing up you agree to our <span className="font-semibold" style={{ color: 'var(--accent)' }}>Terms</span> &amp; <span className="font-semibold" style={{ color: 'var(--accent)' }}>Privacy Policy</span>
            </p>
          </form>

          <div className="mt-8 pt-8 border-t text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link href="/auth/login" className="font-bold hover:underline" style={{ color: 'var(--accent)' }}>Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Brand panel (desktop) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden flex-col justify-between p-12 xl:p-16"
        style={{ background: 'linear-gradient(135deg,#0d0d1a 0%,#1a0a2e 50%,#0d0d1a 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ scale: [1,1.2,1], opacity: [0.4,0.65,0.4] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[-5%] right-[-5%] w-[450px] h-[450px] rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(255,85,194,0.5),transparent 70%)' }} />
          <motion.div animate={{ scale: [1,1.15,1], opacity: [0.3,0.5,0.3] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(114,34,227,0.45),transparent 70%)' }} />
        </div>
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base"
              style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>FT</div>
            <span className="text-white font-black text-lg">Future Times Events</span>
          </Link>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
              Your next event<br />
              <span style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                is waiting
              </span>
            </h2>
            <p className="text-white/60 text-lg">Unlock the full Future Times Events experience.</p>
          </div>
          {[
            { icon: '⚡', label: 'Instant Access', desc: 'Buy tickets in under 60 seconds' },
            { icon: '🎁', label: 'Loyalty Rewards', desc: 'Earn points on every purchase' },
            { icon: '🔒', label: 'Secure Checkout', desc: 'Bank-level payment security' },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.12 }}
              className="flex items-center gap-4 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)' }}>{p.icon}</div>
              <div>
                <p className="text-white font-bold text-sm">{p.label}</p>
                <p className="text-white/50 text-xs">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="relative z-10 text-white/30 text-xs">© 2026 Future Times Events · Harare, Zimbabwe</p>
      </div>
    </div>
  );
}
