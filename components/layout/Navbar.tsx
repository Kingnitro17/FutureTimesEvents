'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { useEvents } from '@/lib/useEvents';
import MobileMenuDrawer from '@/components/layout/MobileMenuDrawer';
import {
  Bell, User, Settings, Ticket, Shield,
  Search, Home, Map, Menu, X, LogOut, LogIn,
  Calendar, Compass, MapPin, UserPlus, ChevronDown, X as CloseIcon
} from 'lucide-react';

const DROPDOWN_ITEMS = [
  { href: '/profile',       label: 'Profile',       icon: User,    badge: 0 },
  { href: '/tickets',       label: 'My Tickets',    icon: Ticket,  badge: 0 },
  { href: '/map',           label: 'Map',           icon: Map,     badge: 0 },
  { href: '/notifications', label: 'Notifications', icon: Bell,    badge: 3 },
  { href: '/settings',      label: 'Settings',      icon: Settings,badge: 0 },
];

const ADMIN_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',     icon: Shield,  badge: 0 },
  { href: '/admin',         label: 'Admin Panel',   icon: Shield,  badge: 0 },
];

// Location suggestions
const LOCATIONS = [
  { name: 'Zimbabwe', country: 'Zimbabwe', emoji: '🇿🇼' },
  { name: 'Harare', country: 'Zimbabwe', emoji: '🏙️' },
  { name: 'Bulawayo', country: 'Zimbabwe', emoji: '🦏' },
  { name: 'Victoria Falls', country: 'Zimbabwe', emoji: '🌊' },
  { name: 'Mutare', country: 'Zimbabwe', emoji: '⛰️' },
  { name: 'Gweru', country: 'Zimbabwe', emoji: '🌾' },
];

const dropVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: -6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
  exit:    { opacity: 0, scale: 0.95, y: -6, transition: { duration: 0.14 } },
};

const menuVariants = {
  hidden:  { opacity: 0, x: '100%' },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  exit:    { opacity: 0, x: '100%', transition: { duration: 0.2 } },
};

export default function Navbar() {
  const [scrolled,       setScrolled]       = useState(false);
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('Zimbabwe');
  const [locationOpen,   setLocationOpen]   = useState(false);
  const dropRef     = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const pathname    = usePathname();
  const router      = useRouter();
  const { user, signOut, isOrganizer, isAdmin } = useAuth();
  const { events } = useEvents();

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTask = window.setTimeout(() => menuPanelRef.current?.querySelector<HTMLElement>('a,button')?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTask);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      menuButton?.focus();
    };
  }, [mobileMenuOpen]);

  /* Remove any stale dark-mode class from previous sessions */
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('ed-theme');
  }, []);

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setLocationOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* ── Filter events for search suggestions ── */
  const searchSuggestions = events.filter(ev =>
    ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.venue.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 6);

  /* ── Filter locations for suggestions ── */
  const locationSuggestions = LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(selectedLocation.toLowerCase()) ||
    loc.country.toLowerCase().includes(selectedLocation.toLowerCase())
  );

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    router.push('/');
  };

  const menuItems = isAdmin || isOrganizer 
    ? [...DROPDOWN_ITEMS, ...ADMIN_ITEMS]
    : DROPDOWN_ITEMS;

  /* ── Mounted state (hydration guard) ── */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  void mounted; // used by child components that may still reference it

  /* ── Static light-mode nav styles ── */
  const navBg = 'bg-white border-gray-200 shadow-sm';

  return (
    <>
      <motion.nav
        initial={false}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
        style={{ height: 'var(--nav-h)' }}
      >
        <div className="container h-full flex items-center justify-between">
          
          {/* ── LOGO ── */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 font-display font-black text-xl shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 14 }}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-black"
            >
              <img
                src="/assets/logo.png"
                alt="Future Times Events"
                className="w-full h-full object-contain p-1"
              />
            </motion.div>
            <span className="tracking-tight text-gray-900">
              Future Times Events
            </span>
          </Link>

          {/* ── DESKTOP CENTER SEARCH & LOCATION ── */}
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-2xl mx-8">
            {/* Search Input */}
            <div className="relative flex-1" ref={searchRef}>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-gray-100 focus-within:bg-white focus-within:border-gray-300 transition-all duration-200">
                <Search size={18} className="text-gray-500" />
                <input
                  type="text"
                  placeholder="Search events, artists, venues..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(e.target.value.length > 0);
                  }}
                  onFocus={() => setSearchOpen(searchQuery.length > 0)}
                  className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}
                    className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <CloseIcon size={14} className="text-gray-500" />
                  </button>
                )}
              </div>

              {/* Search Suggestions Dropdown */}
              <AnimatePresence>
                {searchOpen && searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50"
                  >
                    <div className="p-2">
                      {searchSuggestions.map((ev) => (
                        <Link
                          key={ev.id}
                          href={`/events/${ev.id}`}
                          onClick={() => {
                            setSearchQuery('');
                            setSearchOpen(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-gray-100"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate text-gray-900">{ev.title}</p>
                            <p className="text-xs truncate text-gray-500">{ev.venue} · {ev.date}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Location Selector */}
            <div className="relative" ref={locationRef}>
              <button
                onClick={() => setLocationOpen(!locationOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-gray-100 hover:bg-gray-200 transition-all duration-200 whitespace-nowrap"
              >
                <MapPin size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-900">{selectedLocation}</span>
                <ChevronDown size={14} className="text-gray-500" />
              </button>

              {/* Location Suggestions Dropdown */}
              <AnimatePresence>
                {locationOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50"
                  >
                    <div className="p-2">
                      {LOCATIONS.map((loc) => (
                        <button
                          key={loc.name}
                          onClick={() => {
                            setSelectedLocation(loc.name);
                            setLocationOpen(false);
                            router.push(`/events?city=${encodeURIComponent(loc.name)}`);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left hover:bg-gray-100"
                        >
                          <span className="text-xl">{loc.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">{loc.name}</p>
                            <p className="text-xs text-gray-500">{loc.country}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── RIGHT ACTIONS ── */}
          <div className="flex items-center gap-3">
            
            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="relative" ref={dropRef}>
                    <motion.button 
                      whileHover={{ scale: 1.05 }} 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDropdownOpen(v => !v)}
                      className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: user.avatarColor || 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          user.initials || user.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{user.name.split(' ')[0]}</span>
                    </motion.button>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div variants={dropVariants} initial="hidden" animate="visible" exit="exit"
                          style={{ transformOrigin: 'top right' }}
                          className="absolute right-0 top-14 w-56 rounded-2xl border border-[var(--border)] glass-strong shadow-xl overflow-hidden z-50"
                        >
                          <div className="py-2">
                            <div className="px-4 py-3 border-b border-[var(--border)]">
                              <p className="font-semibold text-[var(--text)] text-sm">{user.name}</p>
                              <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                            </div>
                            {menuItems.map(item => (
                              <Link key={item.href} href={item.href}
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors"
                              >
                                <item.icon size={16} /> {item.label}
                                {item.badge > 0 && (
                                  <span className="ml-auto w-5 h-5 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center">
                                    {item.badge}
                                  </span>
                                )}
                              </Link>
                            ))}
                            <div className="border-t border-[var(--border)] my-1" />
                            <button 
                              onClick={handleSignOut}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                              <LogOut size={16} /> Sign Out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium transition-colors text-gray-700 hover:text-gray-900">
                    Sign in
                  </Link>
                  <Link href="/signup" className="px-5 py-2.5 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                    Sign up
                  </Link>
                </>
              )}
            </div>
            
            {/* Mobile Search Button */}
            <Link
              href="/events"
              className="md:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-gray-100 text-gray-700"
            >
              <Search size={20} />
            </Link>

            {/* Mobile Hamburger Menu */}
            <div className="relative md:hidden">
              <motion.button
                ref={menuButtonRef}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileMenuOpen(v => !v)}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation-menu"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-gray-100 text-gray-700"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </motion.button>

              <MobileMenuDrawer
                open={mobileMenuOpen}
                pathname={pathname ?? ''}
                user={user}
                isOrganizer={isOrganizer}
                panelRef={menuPanelRef}
                onClose={() => setMobileMenuOpen(false)}
                onSignOut={() => void handleSignOut()}
              />

              {/* Backdrop overlay */}
              <AnimatePresence>
                {false && mobileMenuOpen && (
                  <motion.div
                    ref={menuPanelRef}
                    id="mobile-navigation-menu"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Navigation menu"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {false && mobileMenuOpen && (
                  <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.28 }}
                    className="fixed inset-y-0 right-0 z-50 w-[min(92vw,380px)] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
                    style={{
                      background: 'var(--bg)',
                      borderLeft: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  >

                    <div className="flex flex-col flex-1 overflow-y-auto scrollbar-hide px-7 pt-8 pb-10">

                      {/* ── HEADER ── */}
                      <div className="flex items-center justify-between mb-8">
                        <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'var(--grad-primary)' }}>
                            <img src="/assets/logo.png" alt="FTE" className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[15px] leading-tight tracking-tight truncate" style={{ color: 'var(--text)' }}>Future Times</p>
                            <p className="text-[11px] font-medium tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Events</p>
                          </div>
                        </Link>
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setMobileMenuOpen(false)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity duration-150 hover:opacity-80"
                          style={{ background: 'var(--accent)' }}
                          aria-label="Close menu"
                        >
                          <X size={18} className="text-white" strokeWidth={2.5} />
                        </motion.button>
                      </div>



                      {/* ── PRIMARY NAV ── */}
                      <nav className="flex flex-col gap-1 mb-6">
                        {[
                          { href: '/', label: 'Home', icon: Home },
                          { href: '/events', label: 'Browse Events', icon: Compass },
                          { href: '/map', label: 'Map', icon: MapPin },
                          ...(user ? [
                            { href: '/profile', label: 'Profile', icon: User },
                            { href: '/tickets', label: 'My Tickets', icon: Ticket },
                          ] : []),
                          ...(isOrganizer ? [{ href: '/dashboard', label: 'Dashboard', icon: Shield }] : []),
                          ...(isAdmin ? [{ href: '/admin', label: 'Admin Panel', icon: Shield }] : []),
                        ].map(({ href, label, icon: Icon }) => {
                          if (!Icon) return null;
                          const active = pathname === href;
                          return (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-3 px-4 rounded-xl transition-all duration-200"
                              style={{ minHeight: '56px', background: active ? 'rgba(var(--accent-rgb),0.08)' : 'transparent' }}
                            >
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                                style={{ 
                                  background: active ? 'rgba(var(--accent-rgb),0.15)' : 'var(--bg-tertiary)',
                                  color: active ? 'var(--accent)' : 'var(--text-muted)'
                                }}
                              >
                                <Icon size={20} strokeWidth={2} />
                              </div>
                              <span
                                className="text-[17px] font-semibold leading-snug"
                                style={{ color: active ? 'var(--accent)' : 'var(--text)' }}
                              >
                                {label}
                              </span>
                              {active && (
                                <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                              )}
                            </Link>
                          );
                        })}
                      </nav>

                      {/* ── AUTH GROUP ── */}
                      {!user && (
                        <div className="flex flex-col gap-2 mb-6">
                            <Link
                              href="/login"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-3 px-4 rounded-xl transition-colors duration-150 hover:bg-[var(--bg-secondary)]"
                              style={{ minHeight: '52px', color: 'var(--text)' }}
                            >
                              <LogIn size={18} strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--text-muted)' } as React.CSSProperties} />
                              <span className="text-[17px] font-semibold">Sign In</span>
                            </Link>
                            <Link
                              href="/signup"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center justify-center gap-2 rounded-xl font-bold text-white text-[15px] transition-opacity duration-150 hover:opacity-90"
                              style={{ minHeight: '52px', background: 'var(--grad-primary)' }}
                            >
                              <UserPlus size={18} strokeWidth={2} />
                              Create Account
                            </Link>
                          </div>
                      )}

                      {/* ── DIVIDER ── */}
                      <div className="mb-6" style={{ height: 1, background: 'var(--border)' }} />

                      {/* ── SOCIAL ICONS ── */}
                      <div className="flex items-center gap-3 mb-6">
                        {[
                          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>, label: 'Instagram' },
                          { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, label: 'Facebook' },
                          { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M23 7s-.27-1.9-1.1-2.73c-1.05-1.1-2.23-1.1-2.77-1.17C16.36 3 12 3 12 3s-4.36 0-7.13.1c-.54.07-1.72.07-2.77 1.17C1.27 5.1 1 7 1 7S.73 9.1.73 11.2v1.87c0 2.1.27 4.2.27 4.2s.27 1.9 1.1 2.73c1.05 1.1 2.43 1.07 3.04 1.18C7.2 21.27 12 21.27 12 21.27s4.36 0 7.13-.1c.54-.07 1.72-.07 2.77-1.17C22.73 19.17 23 17.27 23 17.27S23.27 15.17 23.27 13.07V11.2C23.27 9.1 23 7 23 7zm-13.84 8.53V8.47L16.6 12l-7.44 3.53z"/></svg>, label: 'YouTube' },
                          { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.67a8.18 8.18 0 0 0 4.8 1.54V6.74a4.86 4.86 0 0 1-1.03-.05z"/></svg>, label: 'TikTok' },
                        ].map(({ icon, label }) => (
                          <a
                            key={label}
                            href="#"
                            aria-label={label}
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                          >
                            {icon}
                          </a>
                        ))}
                      </div>

                        {/* Settings Card — Settings header only, no dark mode row */}
                        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          {/* Card header */}
                          <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                            <Settings size={15} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                            <span className="font-semibold text-[13px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Settings</span>
                          </div>

                          {/* Sign out row */}
                          {user && (
                            <button
                              onClick={handleSignOut}
                              className="w-full flex items-center gap-3 px-4 text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors duration-150"
                              style={{ minHeight: '52px' }}
                            >
                              <LogOut size={16} strokeWidth={2} />
                              <span className="font-medium text-[15px]">Sign Out</span>
                            </button>
                          )}
                        </div>

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
