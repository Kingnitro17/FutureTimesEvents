'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, User, Settings, Ticket, Shield, Sun, Moon,
  Search, Menu, X, ChevronRight, LogOut, Plus, Zap, Map, Heart, Home
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
  const [dark,         setDark]         = useState(false);
  const dropRef  = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  /* ── Theme management ── */
  useEffect(() => {
    const saved = localStorage.getItem('ed-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

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

      {/* ── MOBILE BOTTOM NAV ── */}
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32, delay: 0.15 }}
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden flex justify-center"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)', paddingInline: '16px' }}
      >
        {/* Floating pill container */}
        <div
          className="w-full max-w-sm flex items-center justify-around px-2 py-2 rounded-[2rem]"
          style={{
            background: dark
              ? 'rgba(10,10,20,0.72)'
              : 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            border: dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: dark
              ? '0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          <MobileNavItem href="/"        icon={Home}   label="Home"    active={pathname === '/'}        dark={dark} index={0} />
          <MobileNavItem href="/events"  icon={Search} label="Explore" active={pathname === '/events'}  dark={dark} index={1} />
          <MobileNavItem href="/tickets" icon={Ticket} label="Tickets" active={pathname === '/tickets'} dark={dark} index={2} />
          <MobileNavItem href="/map"     icon={Map}    label="Map"     active={pathname === '/map'}     dark={dark} index={3} />
          <MobileNavItem href="/profile" icon={User}   label="Profile" active={pathname === '/profile'} dark={dark} index={4} />
        </div>
      </motion.div>
    </>
  );
}

function MobileNavItem({
  href, icon: Icon, label, active, dark, index,
}: {
  href: string; icon: any; label: string; active: boolean; dark: boolean; index: number;
}) {
  return (
    <Link href={href} className="relative flex flex-col items-center justify-center w-14 py-2 group">

      {/* Active background pill — shared layoutId for smooth sliding */}
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="mob-nav-pill"
            className="absolute inset-0 rounded-[1.25rem]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            style={{
              background: 'linear-gradient(135deg, rgba(114,34,227,0.22), rgba(79,70,229,0.18))',
              boxShadow: '0 2px 16px rgba(114,34,227,0.25)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Icon + label */}
      <motion.div
        animate={{
          scale: active ? 1.12 : 1,
          y: active ? -1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className="relative z-10 flex flex-col items-center gap-0.5"
      >
        {/* Icon glow on active */}
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -inset-2 rounded-full blur-md"
            style={{ background: 'rgba(114,34,227,0.18)', zIndex: -1 }}
          />
        )}

        <motion.div
          animate={{ color: active ? '#9B5EFF' : dark ? '#86869e' : '#78788c' }}
          transition={{ duration: 0.2 }}
        >
          <Icon
            size={22}
            strokeWidth={active ? 2.5 : 1.8}
          />
        </motion.div>

        <motion.span
          animate={{
            color: active ? '#9B5EFF' : dark ? '#86869e' : '#78788c',
            fontWeight: active ? 700 : 500,
          }}
          transition={{ duration: 0.2 }}
          className="text-[9px] leading-none"
        >
          {label}
        </motion.span>
      </motion.div>

      {/* Active dot */}
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="mob-nav-dot"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute -bottom-0.5 h-[3px] w-5 rounded-full"
            style={{ background: 'linear-gradient(90deg, #7222E3, #9B5EFF)' }}
          />
        )}
      </AnimatePresence>
    </Link>
  );
}

