'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, CheckCircle } from 'lucide-react';
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
    <div
      className="min-h-screen pt-[calc(var(--nav-h)+2rem)] pb-24 flex items-center justify-center px-4 sm:px-6 w-full"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <motion.div {...fadeUp(0)} className="w-full max-w-md">
        <div className="card rounded-3xl p-8 sm:p-10">

          {/* ── HEADER ── */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-[#0a0a0a] flex items-center justify-center overflow-hidden shadow-xl border-2 border-white/5">
              <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-contain p-2" />
            </div>
            <h1 className="type-h2 mb-1" style={{ color: 'var(--text)' }}>Create Account</h1>
            <p className="text-sm leading-snug" style={{ color: 'var(--text-muted)' }}>
              Join Future Times Events today
            </p>
          </div>

          {/* ── FORM ── */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
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
            <div className="flex flex-col gap-1.5">
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
            <div className="flex flex-col gap-1.5">
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
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 flex-shrink-0 rounded"
                style={{ accentColor: 'var(--accent)' }}
                required
              />
              <span className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                I agree to the event booking terms and{' '}
                <Link href="/privacy-policy" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-lg btn-grad w-full text-white disabled:opacity-50 mt-1"
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Sign in
            </Link>
          </p>

        </div>
      </motion.div>
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
