'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, Settings, Ticket, Sun, Moon, Search, Heart, Home, LogOut, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

const dropVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: -6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
  exit:    { opacity: 0, scale: 0.95, y: -6, transition: { duration: 0.14 } },
};

export default function Navbar() {
  const [scrolled,     setScrolled]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user,         setUser]         = useState<any>(null);
  const [profile,      setProfile]      = useState<any>(null);
  const [dark,         setDark]         = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('ed-theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const dropRef  = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router   = useRouter();

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('display_name,initials,avatar_color,role').eq('id', userId).single();
    if (data) setProfile(data);
  }

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('ed-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Close on route change
  useEffect(() => { setDropdownOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    toast.success('Signed out');
    router.push('/');
    router.refresh();
  };

  const initials = profile?.initials || user?.email?.slice(0, 2).toUpperCase() || 'U';
  const avatarColor = profile?.avatar_color || '#7222E3';
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'You';
  const isOrganizer = profile?.role === 'organizer' || profile?.role === 'admin';

  const navBg = dark
    ? 'bg-[#0a0a14] border-white/10 shadow-sm'
    : 'bg-white border-gray-200 shadow-sm';
  const textCol = dark ? 'text-white' : 'text-gray-900';
  const iconBtnCls = `w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${dark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`;

  return (
    <>
      <motion.nav
        initial={false}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${navBg}`}
        style={{ height: 'var(--nav-h)' }}
      >
        <div className="container h-full flex items-center justify-between">

          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2 font-display font-black text-xl shrink-0">
            <motion.div
              whileHover={{ rotate: 18, scale: 1.15 }}
              transition={{ type: 'spring', stiffness: 400, damping: 14 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}
            >
              <span className="text-sm leading-none font-black">FT</span>
            </motion.div>
            <span className={`tracking-tight transition-colors duration-300 ${textCol}`}>
              Future Times Events
            </span>
          </Link>

          {/* DESKTOP CENTER LINKS */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${pathname === '/' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}>
              <Home size={16} /> Home
            </Link>
            <Link href="/events" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${pathname.startsWith('/events') ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}>
              <Search size={16} /> Explore
            </Link>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-3">

            {/* Mobile search */}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/events')}
              className={`flex md:hidden items-center gap-2 px-4 py-2 rounded-full border transition-colors ${dark ? 'border-white/10 bg-white/5 text-white' : 'border-gray-200 bg-gray-50 text-gray-700'}`}
            >
              <Search size={16} />
              <span className="text-sm font-medium">Search</span>
            </motion.button>

            {/* Theme toggle */}
            <button onClick={() => setDark(!dark)} className={`hidden md:flex ${iconBtnCls}`}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* AUTH: Logged in */}
            {user ? (
              <>
                {/* Notifications bell */}
                <Link href="/notifications" className={`hidden md:flex ${iconBtnCls} relative`}>
                  <Bell size={18} />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                </Link>

                {/* Avatar dropdown */}
                <div className="relative" ref={dropRef}>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setDropdownOpen(v => !v)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shadow-md"
                    style={{ background: avatarColor }}
                  >
                    {initials}
                  </motion.button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div variants={dropVariants} initial="hidden" animate="visible" exit="exit"
                        style={{ transformOrigin: 'top right' }}
                        className="absolute right-0 top-14 w-64 rounded-2xl border border-[var(--border)] glass-strong shadow-xl overflow-hidden z-50"
                      >
                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-[var(--border)]">
                          <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{displayName}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                        </div>

                        <div className="py-1">
                          {[
                            { href: '/profile',       label: 'My Profile',    icon: User },
                            { href: '/tickets',       label: 'My Tickets',    icon: Ticket },
                            { href: '/notifications', label: 'Notifications', icon: Bell },
                            { href: '/settings',      label: 'Settings',      icon: Settings },
                            ...(isOrganizer ? [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
                          ].map(item => (
                            <Link key={item.href} href={item.href}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--bg-secondary)] transition-colors"
                              style={{ color: 'var(--text)' }}>
                              <item.icon size={14} style={{ color: 'var(--text-muted)' }} /> {item.label}
                            </Link>
                          ))}

                          <div className="border-t border-[var(--border)] my-1" />

                          <button onClick={() => setDark(!dark)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--bg-secondary)] transition-colors"
                            style={{ color: 'var(--text)' }}>
                            {dark ? <Sun size={14} style={{ color: 'var(--text-muted)' }} /> : <Moon size={14} style={{ color: 'var(--text-muted)' }} />}
                            Toggle Theme
                          </button>

                          <button onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <LogOut size={14} /> Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* AUTH: Not logged in */
              <>
                <div className="hidden md:flex items-center gap-4">
                  <Link href="/auth/login" className={`text-sm font-medium transition-colors ${dark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}>
                    Sign in
                  </Link>
                  <Link href="/auth/signup" className="px-5 py-2.5 rounded-full text-sm font-bold text-white transition-colors shadow-md"
                    style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
                    Sign up
                  </Link>
                </div>

                {/* Mobile: avatar icon opens login */}
                <Link href="/auth/login" className={`flex md:hidden ${iconBtnCls}`}>
                  <User size={18} />
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.nav>
    </>
  );
}
