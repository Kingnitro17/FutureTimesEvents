'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { signInWithGoogle } from '@/lib/oauth';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Suspense } from 'react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pathname     = usePathname();
  const { signIn, user, isLoading: authLoading }   = useAuth();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError,   setOauthError]   = useState(false);

  // Detect ?error=oauth redirect from /auth/callback
  useEffect(() => {
    if (searchParams?.get('error') === 'oauth') {
      setOauthError(true);
      toast.error('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user && pathname === '/login') {
      const redirectTo = searchParams?.get('next') || '/profile';
      // Small delay to ensure auth state is fully settled before redirect
      const timer = setTimeout(() => {
        router.replace(redirectTo);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, pathname, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed') ||
          error.message?.toLowerCase().includes('not confirmed')) {
        toast.error('Please verify your email before signing in. Check your inbox.', { duration: 5000 });
      } else if (error.message?.toLowerCase().includes('invalid login')) {
        toast.error('Incorrect email or password.');
      } else {
        toast.error(error.message);
      }
      setIsLoading(false);
    }
    // On success, the auth context will update user state and the redirect effect will fire
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    try {
      await signInWithGoogle('/profile');
      // Page will redirect — no need to setOauthLoading(false)
    } catch {
      toast.error('Google sign-in unavailable. Please use email.');
      setOauthLoading(false);
    }
  };

  // Show full-page spinner during sign-in (same as events page loading)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[calc(var(--nav-h)+2rem)] pb-24 flex items-center justify-center px-4 sm:px-6" style={{ background: 'var(--bg-secondary)' }}>
      <motion.div {...fadeUp(0)} className="w-full max-w-md">
        <div className="card rounded-3xl p-8 sm:p-10">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-[#0a0a0a] flex items-center justify-center overflow-hidden shadow-xl border-2 border-white/5">
              <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-contain p-2" />
            </div>
            <h1 className="type-h2 text-[var(--text)] mb-2">Welcome Back</h1>
            <p className="type-sm text-[var(--text-muted)]">Sign in to continue your journey</p>
          </div>

          {/* OAuth error banner */}
          {oauthError && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-5 text-sm font-medium text-red-500 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800/40">
              <AlertCircle size={16} className="shrink-0" />
              Google sign-in failed. Try again or use email below.
            </div>
          )}

          {/* ── Google OAuth Button ── */}
          <motion.button
            id="btn-google-signin"
            onClick={handleGoogle}
            disabled={oauthLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-lg btn-ghost w-full mb-4 relative overflow-hidden group"
            style={{ borderWidth: '1.5px' }}
          >
            {/* Subtle hover gradient */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]"
              style={{ background: 'linear-gradient(135deg,rgba(255,85,194,0.06),rgba(114,34,227,0.06))' }} />
            {oauthLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="font-semibold">{oauthLoading ? 'Redirecting…' : 'Continue with Google'}</span>
          </motion.button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[var(--bg-card)] text-[var(--text-muted)]">or sign in with email</span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)]" htmlFor="login-email">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                  style={{ paddingLeft: '3rem' }}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)]" htmlFor="login-password">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 flex-shrink-0 rounded" 
                  style={{ accentColor: 'var(--accent)' }} 
                />
                <span className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Remember me
                </span>
              </label>
              <Link href="#" className="text-[12px] font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              id="btn-email-signin"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="btn btn-lg btn-grad w-full text-white disabled:opacity-50 mt-1"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
              {!isLoading && <ArrowRight size={18} />}
            </motion.button>
          </form>

          {/* Sign up link */}
          <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[var(--accent)] hover:underline">Sign up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
