'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, ShieldCheck, Sparkles, TicketCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Suspense } from 'react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

function SignupContent() {
  const { signUp, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  useEffect(() => {
    if (!authLoading && user && pathname === '/signup') {
      const redirectTo = searchParams?.get('next') || '/profile';
      router.replace(redirectTo);
      return;
    }
  }, [user, authLoading, pathname, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Public sign-ups always start as attendees. Staff and manager roles are
    // assigned by an administrator so an account cannot promote itself.
    const { error } = await signUp(email, password, { name, role: 'attendee' });

    if (error) {
      // Supabase returns this when the user already exists but is unconfirmed
      if (error.message?.toLowerCase().includes('already registered')) {
        toast.error('An account with this email already exists. Please sign in.');
      } else {
        toast.error(error.message);
      }
      setIsLoading(false);
    } else {
      toast.success('Account created successfully!');
      setIsLoading(false);
    }
  };



  // Show full-page spinner during sign-up (same as events page loading)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── Sign-up form ───────────────────────────────────────────────────
  return (
    <div className="page-offset min-h-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]" style={{ background: 'var(--bg-secondary)' }}>
      <aside
        className="relative hidden min-h-[calc(100vh-var(--nav-h))] overflow-hidden lg:flex lg:flex-col lg:justify-between"
        style={{ padding: 'clamp(2.5rem, 5vw, 5rem)', background: 'var(--grad-primary)' }}
        aria-label="Future Times Events"
      >
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-300/15 blur-3xl" aria-hidden="true" />
        <Link href="/" className="relative z-10 flex w-fit items-center text-white" style={{ gap: 'var(--sp-3)' }}>
          <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-black shadow-xl">
            <Image src="/assets/logo.png" alt="" width={64} height={64} className="object-contain" style={{ padding: '5px' }} />
          </span>
          <span><strong className="block font-display text-2xl font-black leading-tight">Future Times Events</strong><span className="block text-sm font-medium text-white/75">Unforgettable moments start here</span></span>
        </Link>
        <div className="relative z-10 max-w-xl text-white">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 text-xs font-bold uppercase tracking-[0.15em]" style={{ padding: 'var(--sp-2) var(--sp-3)' }}>Join the community</span>
          <h2 className="font-display font-black leading-[1.02] text-white" style={{ marginTop: 'var(--sp-4)', fontSize: 'clamp(2.8rem, 5vw, 5rem)', fontWeight: 900 }}>Create your account. Find your next moment.</h2>
          <p className="max-w-lg text-lg leading-relaxed text-white/80" style={{ marginTop: 'var(--sp-4)' }}>Join Future Times Events to discover Zimbabwe&apos;s best experiences and keep every secure ticket in one place.</p>
          <div className="flex flex-col" style={{ gap: 'var(--sp-3)', marginTop: 'var(--sp-5)' }}>
            {[
              { icon: Sparkles, text: 'Personal event discovery' },
              { icon: TicketCheck, text: 'Secure tickets and bookings' },
              { icon: ShieldCheck, text: 'Protected attendee profile' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center font-semibold text-white" style={{ gap: 'var(--sp-3)' }}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10"><Icon size={21} /></span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-sm text-white/65">Future Times Events · Zimbabwe</p>
      </aside>

      <div className="flex min-h-[calc(100vh-var(--nav-h))] items-center justify-center" style={{ padding: 'clamp(1rem, 4vw, 3rem)' }}>
      <motion.div {...fadeUp(0)} className="w-full max-w-md" style={{ marginInline: 'auto' }}>
        <div className="card flex flex-col rounded-[var(--r-3xl)]" style={{ padding: 'clamp(1.25rem, 5vw, 2.5rem)', gap: 'var(--sp-4)', boxSizing: 'border-box' }}>

          {/* ── HEADER ── */}
          <div className="flex flex-col items-center text-center" style={{ gap: 'var(--sp-2)' }}>
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 border-white/5 bg-[#0a0a0a] shadow-xl lg:hidden">
              <Image src="/assets/logo.png" alt="Future Times Events" width={80} height={80} className="h-full w-full object-contain" style={{ padding: 'var(--sp-2)' }} />
            </div>
            <h1 className="type-h2 mb-1" style={{ color: 'var(--text)' }}>Create Account</h1>
            <p className="text-sm leading-snug" style={{ color: 'var(--text-muted)' }}>
              Join Future Times Events today
            </p>
          </div>

          {/* ── FORM ── */}
          <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 'var(--sp-4)' }}>

            {/* Full Name */}
            <div className="flex flex-col" style={{ gap: 'var(--sp-1)' }}>
              <label className="text-[13px] font-medium leading-none" style={{ color: 'var(--text)' }}>
                Full Name
              </label>
              <div className="relative w-full">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="input w-full"
                  style={{ paddingLeft: 40, paddingRight: 16 }}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col" style={{ gap: 'var(--sp-1)' }}>
              <label className="text-[13px] font-medium leading-none" style={{ color: 'var(--text)' }}>
                Email
              </label>
              <div className="relative w-full">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input w-full"
                  style={{ paddingLeft: 40, paddingRight: 16 }}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col" style={{ gap: 'var(--sp-1)' }}>
              <label className="text-[13px] font-medium leading-none" style={{ color: 'var(--text)' }}>
                Password
              </label>
              <div className="relative w-full">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input w-full"
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                Must be at least 6 characters
              </p>
            </div>

            {/* Terms */}
            <label className="flex cursor-pointer items-start rounded-xl" style={{ gap: 'var(--sp-2)', padding: 'var(--sp-2)' }}>
              <input
                type="checkbox"
                className="h-5 w-5 flex-shrink-0 rounded"
                style={{ accentColor: 'var(--accent)', marginTop: 1 }}
                required
              />
              <span className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                I agree to the event booking terms and{' '}
                <Link href="/privacy-policy" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-lg btn-grad w-full text-white disabled:opacity-50"
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="max-w-none text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Sign in
            </Link>
          </p>

        </div>
      </motion.div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
