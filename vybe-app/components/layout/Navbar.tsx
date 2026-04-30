'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, User, Settings, Ticket, Shield, Sun, Moon,
  Search, Heart, Home
} from 'lucide-react';

const DROPDOWN_ITEMS = [
  { href: '/profile',       label: 'Account',       icon: User,    badge: 0 },
  { href: '/tickets',       label: 'My Tickets',    icon: Ticket,  badge: 0 },
  { href: '/notifications', label: 'Notifications', icon: Bell,    badge: 3 },
  { href: '/settings',      label: 'Settings',      icon: Settings,badge: 0 },
  { href: '/admin',         label: 'Admin',         icon: Shield,  badge: 0 },
];

const dropVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: -6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
  exit:    { opacity: 0, scale: 0.95, y: -6, transition: { duration: 0.14 } },
};

export default function Navbar() {
  const [scrolled,     setScrolled]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dark,         setDark]         = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('ed-theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const dropRef  = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('ed-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('ed-theme', 'light');
    }
  }, [dark]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* ── Computed nav styles ── */
  const navBg = dark 
    ? 'bg-[#0a0a14] border-white/10 shadow-sm' 
    : 'bg-white border-gray-200 shadow-sm';
  const textCol = dark ? 'text-white' : 'text-gray-900';
  const iconBtnCls = `w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${dark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`;

  return (
    <>
      <motion.nav
        initial={false}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
        style={{ height: 'var(--nav-h)' }}
      >
        <div className="container h-full flex items-center justify-between">
          
          {/* ── LOGO ── */}
          <Link href="/" className="flex items-center gap-2 font-display font-black text-xl shrink-0">
            <motion.div
              whileHover={{ rotate: 18, scale: 1.15 }}
              transition={{ type: 'spring', stiffness: 400, damping: 14 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg,#1D5BFF,#7222E3)' }}
            >
              <span className="text-xl leading-none">e</span>
            </motion.div>
            <span className={`tracking-tight transition-colors duration-300 ${textCol}`}>
              events distro
            </span>
          </Link>

          {/* ── DESKTOP CENTER LINKS ── */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium text-sm transition-colors hover:bg-gray-200 dark:hover:bg-white/20">
              <Home size={16} /> Home
            </Link>
            <Link href="/events" className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-600 dark:text-gray-300 font-medium text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
              <Search size={16} /> Explore
            </Link>
          </div>

          {/* ── RIGHT ACTIONS ── */}
          <div className="flex items-center gap-3">
            
            {/* Mobile Search/Heart */}
            <div className="flex md:hidden items-center gap-2">
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/events')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${dark ? 'border-white/10 bg-white/5 text-white' : 'border-gray-200 bg-gray-50 text-gray-700'}`}
              >
                <Search size={16} />
                <span className="text-sm font-medium">Search</span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={iconBtnCls}>
                <Heart size={20} />
              </motion.button>
            </div>

            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/login" className={`text-sm font-medium transition-colors ${dark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}>
                Sign in
              </Link>
              <Link href="/signup" className="px-5 py-2.5 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                Sign up
              </Link>
              <button onClick={() => setDark(!dark)} className={`transition-colors ${dark ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
            
            {/* Avatar Dropdown (Mobile fallback for now) */}
            <div className="relative md:hidden" ref={dropRef}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setDropdownOpen(v => !v)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 overflow-hidden"
              >
                <User size={18} />
              </motion.button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div variants={dropVariants} initial="hidden" animate="visible" exit="exit"
                    style={{ transformOrigin: 'top right' }}
                    className="absolute right-0 top-14 w-56 rounded-2xl border border-[var(--border)] glass-strong shadow-xl overflow-hidden z-50"
                  >
                    <div className="py-1">
                      <button onClick={() => setDark(!dark)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors">
                        {dark ? <Sun size={14} /> : <Moon size={14} />} Toggle Theme
                      </button>
                      <div className="border-t border-[var(--border)] my-1" />
                      <Link href="/login" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors">
                        Sign in
                      </Link>
                      <Link href="/signup" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors">
                        Sign up
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </motion.nav>
    </>
  );
}
