'use client';
import Link from 'next/link';
import UpcomingHero from '@/components/home/UpcomingHero';
import { useEvents } from '@/lib/useEvents';
import EventsInCitySection from '@/components/home/EventsInCitySection';
import CityOvalsSection from '@/components/home/CityOvalsSection';
import AboutSection from '@/components/home/AboutSection';
import CategoryMarquee from '@/components/home/CategoryMarquee';


export default function HomePage() {
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
      {/* ── EVENT CATEGORIES MARQUEE ── */}
      <CategoryMarquee />

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
