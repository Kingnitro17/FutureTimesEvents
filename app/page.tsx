'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import UpcomingHero from '@/components/home/UpcomingHero';
import { EventbriteCardList } from '@/components/home/EventbriteCardList';
import { MOCK_EVENTS } from '@/lib/mockData';
import EventsInCitySection from '@/components/home/EventsInCitySection';
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
  const [location] = useState('Harare, Zimbabwe');
  const [page, setPage] = useState(1);

  const visible = MOCK_EVENTS.slice(0, Math.min(5, page * 5));

  return (
    <div className="min-h-screen pb-nav">

      <UpcomingHero events={MOCK_EVENTS} locationLabel={location.split(',')[0] || 'Zimbabwe'} />

      {/* Intentional breathing room after hero (noticeably larger than header) */}
      <div aria-hidden className="h-[calc(var(--nav-h)+16px)] sm:h-24" />

      {/* ── EVENT CATEGORIES MARQUEE ── */}
      <section className="relative z-10 section-pad overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="container mb-6">
          <div className="section-title">
            <span className="overline">Browse by interest</span>
            <h2>Event Categories</h2>
          </div>
        </div>
        
        {/* Marquee Container */}
        <div className="relative w-full">
          {/* Edge fades */}
          <div className="absolute inset-y-0 left-0 w-8 sm:w-16 pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, var(--bg) 0%, transparent 100%)' }} />
          <div className="absolute inset-y-0 right-0 w-8 sm:w-16 pointer-events-none z-10" style={{ background: 'linear-gradient(270deg, var(--bg) 0%, transparent 100%)' }} />
          
          <div className="flex w-max animate-marquee gap-4 sm:gap-6 px-4 hover:cursor-pointer">
            {[...CATEGORY_ICONS, ...CATEGORY_ICONS, ...CATEGORY_ICONS, ...CATEGORY_ICONS].map(({ id, label, icon: Icon, grad }, i) => (
              <button
                key={`${id}-${i}`}
                onClick={() => router.push(`/events?cat=${id}`)}
                className="flex flex-col items-center gap-4 shrink-0 group transition-all duration-300 hover:-translate-y-1"
                style={{ minWidth: '88px' }}
              >
                {/* Circle */}
                <div
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1.5px solid var(--border)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    style={{
                      background: grad,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      display: 'flex',
                    }}
                  >
                    <Icon size={28} strokeWidth={2.5} style={{ color: 'inherit' }} />
                  </div>
                </div>

                {/* Label */}
                <span
                  className="text-[13px] font-black text-center leading-tight whitespace-pre-line tracking-tight"
                  style={{ color: 'var(--text)' }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVENTS IN CITY (replaces "What's Hot Right Now") ── */}
      <EventsInCitySection events={MOCK_EVENTS} city="Harare" country="Zimbabwe" />

      {/* ── UPCOMING EVENTS LIST ── */}
      <section className="section-pad-sm relative z-10 border-t border-gray-200 dark:border-white/5" style={{ background: 'var(--bg)' }}>
        <div className="container">
          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontSize: 'clamp(1.1rem,2vw + 0.8rem,1.375rem)' }}>Upcoming Events</h2>
            <Link
              href="/events"
              className="flex items-center gap-1 text-blue-500 text-xs font-semibold"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {visible.map((ev) => (
              <EventbriteCardList key={ev.id} event={ev} />
            ))}
          </div>

          {visible.length < Math.min(5, MOCK_EVENTS.length) && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-6 py-4 min-h-12 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-[var(--text)] text-sm font-medium"
              >
                Load More Events <ChevronDown size={16} className="inline-block ml-1" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── BENTO CTA ── */}
      <section className="section-pad-sm" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-5xl mx-auto">

            <div className="card rounded-2xl md:rounded-3xl p-6 md:p-8 overflow-hidden relative group">
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(1200px 600px at 20% 0%, rgba(255,85,194,0.10), transparent 60%), radial-gradient(1200px 600px at 80% 100%, rgba(114,34,227,0.10), transparent 55%)' }}
              />
              <div className="relative z-10 flex flex-col gap-4">
                <span className="badge badge-grad self-start">FOR ORGANIZERS</span>
                <h3 className="text-xl md:text-2xl font-black text-[var(--text)] tracking-tight">Host Your Next Event</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Create events, manage ticket sales, and track analytics in real-time with our powerful organizer tools.
                </p>
                <div className="pt-4">
                  <Link href="/dashboard" className="btn btn-lg btn-grad text-white">Go to Dashboard</Link>
                </div>
              </div>
            </div>

            <div className="card rounded-2xl md:rounded-3xl p-6 md:p-8 overflow-hidden relative group">
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(1200px 600px at 25% 0%, rgba(44,196,234,0.10), transparent 60%), radial-gradient(1200px 600px at 75% 100%, rgba(29,91,255,0.10), transparent 55%)' }}
              />
              <div className="relative z-10 flex flex-col gap-4">
                <span className="badge badge-info self-start text-blue-500">FOR FANS</span>
                <h3 className="text-xl md:text-2xl font-black text-[var(--text)] tracking-tight">Join the VIP Club</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Earn points on every ticket, get exclusive early access, and unlock special badges as you explore.
                </p>
                <div className="pt-4">
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
