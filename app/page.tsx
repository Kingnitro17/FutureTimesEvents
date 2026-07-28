'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import UpcomingHero from '@/components/home/UpcomingHero';
import { useEvents } from '@/lib/useEvents';
import EventsInCitySection from '@/components/home/EventsInCitySection';
import CityOvalsSection from '@/components/home/CityOvalsSection';
import AboutSection from '@/components/home/AboutSection';
import {
  Music, Palette, Heart,
  Sparkles, Plane, Gamepad2, Briefcase, UtensilsCrossed,
} from 'lucide-react';

const CATEGORY_ICONS = [
  { id: 'music',    label: 'Music',              icon: Music,   grad: 'linear-gradient(135deg,#FF55C2,#7222E3)' },
  { id: 'nightlife',label: 'Nightlife',          icon: Sparkles,grad: 'linear-gradient(135deg,#7222E3,#4F46E5)' },
  { id: 'arts',     label: 'Performing &\nVisual Arts', icon: Palette, grad: 'linear-gradient(135deg,#2CC4EA,#533885)' },
  { id: 'holidays', label: 'Holidays',           icon: Plane,   grad: 'linear-gradient(135deg,#46FFAB,#2CC4EA)' },
  { id: 'dating',   label: 'Dating',             icon: Heart,   grad: 'linear-gradient(135deg,#FF6B6B,#FF55C2)' },
  { id: 'hobbies',  label: 'Hobbies',            icon: Gamepad2,grad: 'linear-gradient(135deg,#FFBC73,#FF6B6B)' },
  { id: 'business', label: 'Business',           icon: Briefcase,grad:'linear-gradient(135deg,#1D5BFF,#2CC4EA)' },
  { id: 'food',     label: 'Food & Drink',       icon: UtensilsCrossed, grad: 'linear-gradient(135deg,#46FFAB,#1D5BFF)' },
];


export default function HomePage() {
  const router = useRouter();
  const location = 'Harare, Zimbabwe';
  const { events, loading, error } = useEvents();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading events…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-4xl">⚠️</p>
        <p className="font-semibold text-[var(--text)]">Could not load events</p>
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-nav">

      <UpcomingHero events={events} locationLabel={location.split(',')[0] || 'Zimbabwe'} />

      {/* Scroll Animation Section - Centered in empty space */}
      <div className="relative h-32 sm:h-40 flex items-center justify-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-secondary)]/30 to-transparent" />
        
        {/* Animated scroll indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          {/* Bouncing mouse container */}
          <motion.div
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            {/* Outer glow ring */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-[var(--accent)]/20 blur-xl"
            />
            
            {/* Mouse icon */}
            <div className="relative w-10 h-14 sm:w-12 sm:h-16 rounded-[1.5rem] border-[2px] border-[var(--accent)] bg-[var(--bg)]/80 backdrop-blur-sm flex justify-center pt-3 shadow-lg shadow-[var(--accent)]/20">
              {/* Scroll wheel */}
              <motion.div
                animate={{ y: [0, 12, 0], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-2.5 h-3 sm:w-3 sm:h-4 rounded-full bg-gradient-to-b from-[var(--accent)] to-[#7222E3]"
              />
            </div>
          </motion.div>
          
          {/* Animated text */}
          <motion.p
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs sm:text-sm font-bold tracking-widest uppercase text-[var(--text-muted)]"
          >
            Scroll to explore
          </motion.p>
        </motion.div>
      </div>

      {/* ── EVENT CATEGORIES MARQUEE ── */}
      <section className="relative z-10 section-pad overflow-hidden">
        {/* Subtle gradient background for smooth theme transition */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg)] via-[var(--bg-secondary)] to-[var(--bg)] opacity-50" />
        
        <div className="container mb-6 relative z-10">
          <div className="section-title">
            <span className="overline">Browse by interest</span>
            <h2>Event Categories</h2>
          </div>
        </div>
        
        {/* Marquee Container */}
        <div className="relative w-full z-10">
          {/* Smooth edge gradients - no hard lines */}
          <div className="absolute inset-y-0 left-0 w-12 sm:w-24 pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, var(--bg) 0%, transparent 70%)' }} />
          <div className="absolute inset-y-0 right-0 w-12 sm:w-24 pointer-events-none z-10" style={{ background: 'linear-gradient(270deg, var(--bg) 0%, transparent 70%)' }} />
          
          <div className="flex w-max animate-marquee gap-5 sm:gap-8 px-6 hover:cursor-pointer">
            {[...CATEGORY_ICONS, ...CATEGORY_ICONS, ...CATEGORY_ICONS, ...CATEGORY_ICONS].map(({ id, label, icon: Icon, grad }, i) => (
              <motion.button
                key={`${id}-${i}`}
                onClick={() => router.push(`/events?cat=${id}`)}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-3 shrink-0 group"
                style={{ minWidth: '88px' }}
              >
                {/* Polished gradient circle - no borders */}
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center transition-all duration-300"
                  style={{ 
                    background: grad,
                    boxShadow: `0 12px 32px ${grad.split(',')[1].replace(')', '')}, 0.25),
                                0 4px 8px rgba(0,0,0,0.1)`,
                  }}
                >
                  <Icon 
                    size={32} 
                    strokeWidth={1.5} 
                    className="text-white drop-shadow-lg" 
                  />
                </div>

                {/* Label with gradient text effect */}
                <span
                  className="text-[13px] font-bold text-center leading-tight whitespace-pre-line tracking-tight transition-all duration-300 group-hover:scale-105"
                  style={{ 
                    color: 'var(--text)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  {label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVENTS IN CITY (replaces "What's Hot Right Now") ── */}
      <EventsInCitySection events={events} city="Zimbabwe" country="Zimbabwe" />

      {/* ── ABOUT SECTION ── */}
      <AboutSection />

      {/* ── CITY OVALS — horizontal scroll, TravelPerk-style capsules ── */}
      <CityOvalsSection />

      {/* ── HOST YOUR EVENT + VIP CLUB CARDS ── */}
      <section className="section-pad-sm">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-7xl mx-auto">

            <div
              className="rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden relative group"
              style={{ padding: 'clamp(1.25rem, 4vw, 2rem)', boxSizing: 'border-box' }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(800px 400px at 20% 0%, rgba(255,85,194,0.08), transparent 60%), radial-gradient(800px 400px at 80% 100%, rgba(114,34,227,0.08), transparent 55%)' }}
              />
              <div className="relative z-10 flex flex-col gap-4" style={{ minWidth: 0 }}>
                <span className="badge badge-grad self-start shrink-0">FOR ORGANIZERS</span>
                <h3 className="font-black text-[var(--text)] tracking-tight" style={{ fontSize: 'clamp(1.1rem, 2vw + 0.5rem, 1.5rem)' }}>
                  Host Your Next Event
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed" style={{ maxInlineSize: '52ch' }}>
                  Create events, manage ticket sales, and track analytics in real-time with our powerful organizer tools.
                </p>
                <div className="pt-2">
                  <Link href="/dashboard" className="btn btn-lg btn-grad text-white">Go to Dashboard</Link>
                </div>
              </div>
            </div>

            <div
              className="rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden relative group"
              style={{ padding: 'clamp(1.25rem, 4vw, 2rem)', boxSizing: 'border-box' }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(800px 400px at 25% 0%, rgba(44,196,234,0.08), transparent 60%), radial-gradient(800px 400px at 75% 100%, rgba(29,91,255,0.08), transparent 55%)' }}
              />
              <div className="relative z-10 flex flex-col gap-4" style={{ minWidth: 0 }}>
                <span className="badge badge-info self-start shrink-0" style={{ color: '#0ea5e9' }}>FOR FANS</span>
                <h3 className="font-black text-[var(--text)] tracking-tight" style={{ fontSize: 'clamp(1.1rem, 2vw + 0.5rem, 1.5rem)' }}>
                  Join the VIP Club
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed" style={{ maxInlineSize: '52ch' }}>
                  {events.length} upcoming events across Zimbabwe. Earn points on every ticket, get exclusive early access, and unlock special badges as you explore.
                </p>
                <div className="pt-2">
                  <Link href="/profile" className="btn btn-lg btn-primary">View My Profile</Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
