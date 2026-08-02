'use client';

import type { MouseEvent, RefObject } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CirclePlus,
  ClipboardList,
  Home,
  Info,
  LogIn,
  LogOut,
  Mail,
  Map,
  MapPin,
  Pencil,
  ScanLine,
  Settings,
  Sparkles,
  Ticket,
  UserRound,
  X,
} from 'lucide-react';
import type { User } from '@/types';

type MenuItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

const DISCOVER: MenuItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/#event-categories', label: 'Browse by Interest', icon: Sparkles },
  { href: '/#top-destinations', label: 'Top Destinations', icon: MapPin },
];

const TICKETS: MenuItem[] = [
  { href: '/tickets', label: 'My Tickets', icon: Ticket },
  { href: '/tickets', label: 'Bookings', icon: ClipboardList },
  { href: '/checkin', label: 'Check In History', icon: ScanLine },
];

const ORGANIZER: MenuItem[] = [
  { href: '/dashboard', label: 'Host Your Event', icon: CirclePlus },
  { href: '/dashboard', label: 'Organizer Dashboard', icon: BarChart3 },
];

const ACCOUNT: MenuItem[] = [
  { href: '/profile', label: 'Profile', icon: UserRound },
  { href: '/settings', label: 'Edit Profile', icon: Pencil },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const SUPPORT: MenuItem[] = [
  { href: '/privacy-policy', label: 'Help Center', icon: CircleHelp },
  { href: 'mailto:support@futuretimesevents.com', label: 'Contact Us', icon: Mail },
  { href: '/#about', label: 'About Us', icon: Info },
];

function isActive(pathname: string, href: string) {
  const path = href.split('#')[0];
  if (href === '/') return pathname === '/';
  return path !== '/' && pathname.startsWith(path);
}

function MenuSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: MenuItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  const handleNavigate = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    const hash = href.startsWith('/#') ? href.slice(2) : '';
    if (hash && pathname === '/') {
      event.preventDefault();
      onNavigate();
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `/#${hash}`);
      }, 80);
      return;
    }
    onNavigate();
  };

  return (
    <section className="mobile-drawer-section" aria-labelledby={`mobile-menu-${title.replace(/\W+/g, '-').toLowerCase()}`}>
      <h2 id={`mobile-menu-${title.replace(/\W+/g, '-').toLowerCase()}`} className="mobile-drawer-label">
        {title}
      </h2>
      <nav className="mobile-drawer-list" aria-label={title}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={`${title}-${label}`}
              href={href}
              onClick={(event) => handleNavigate(event, href)}
              className={`mobile-drawer-item ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="mobile-drawer-icon" aria-hidden="true"><Icon size={21} strokeWidth={2.1} /></span>
              <span className="mobile-drawer-item-text">{label}</span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

export default function MobileMenuDrawer({
  open,
  pathname,
  user,
  isOrganizer,
  panelRef,
  onClose,
  onSignOut,
}: {
  open: boolean;
  pathname: string;
  user: User | null;
  isOrganizer: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const membership = user?.isVip ? 'VIP' : 'SILVER';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px]"
            aria-label="Close navigation menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            id="mobile-navigation-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.3 }}
            className="mobile-drawer fixed inset-y-0 left-0 z-50 flex w-[min(92vw,430px)] flex-col overflow-hidden bg-white"
          >
            <div className="mobile-drawer-scroll scrollbar-hide">
              <header className="mobile-drawer-header">
                <Link href="/" onClick={onClose} className="mobile-drawer-brand">
                  <span className="mobile-drawer-logo"><img src="/assets/logo.png" alt="" /></span>
                  <span className="min-w-0">
                    <strong>Future Times Events</strong>
                    <small>Unforgettable moments</small>
                  </span>
                </Link>
                <button type="button" onClick={onClose} className="mobile-drawer-close" aria-label="Close menu">
                  <X size={25} strokeWidth={2} />
                </button>
              </header>

              {user ? (
                <Link href="/profile" onClick={onClose} className="mobile-drawer-profile">
                  <span className="mobile-drawer-avatar">
                    {user.avatar ? <img src={user.avatar} alt="" /> : <UserRound size={32} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <strong className="truncate">{user.name}</strong>
                      <span className="mobile-drawer-badge">{membership}</span>
                    </span>
                    <span className="mobile-drawer-profile-copy">View profile</span>
                  </span>
                  <ChevronRight size={20} aria-hidden="true" />
                </Link>
              ) : (
                <Link href="/login" onClick={onClose} className="mobile-drawer-profile">
                  <span className="mobile-drawer-avatar"><UserRound size={32} /></span>
                  <span className="min-w-0 flex-1"><strong>Welcome</strong><span className="mobile-drawer-profile-copy">Sign in to view your profile</span></span>
                  <LogIn size={20} aria-hidden="true" />
                </Link>
              )}

              <MenuSection title="Discover" items={DISCOVER} pathname={pathname} onNavigate={onClose} />
              <MenuSection title="Tickets & Bookings" items={TICKETS} pathname={pathname} onNavigate={onClose} />
              <MenuSection title="Organizer" items={isOrganizer ? ORGANIZER : ORGANIZER.slice(0, 1)} pathname={pathname} onNavigate={onClose} />
              <MenuSection title="Account" items={ACCOUNT} pathname={pathname} onNavigate={onClose} />
              <MenuSection title="Support" items={SUPPORT} pathname={pathname} onNavigate={onClose} />

              {user ? (
                <button type="button" className="mobile-drawer-logout" onClick={onSignOut}>
                  <LogOut size={21} /> Log out
                </button>
              ) : (
                <Link href="/signup" onClick={onClose} className="mobile-drawer-logout mobile-drawer-create">
                  <CirclePlus size={21} /> Create account
                </Link>
              )}
              <p className="mobile-drawer-version">v2.0.0</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
