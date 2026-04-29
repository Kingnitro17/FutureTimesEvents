'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import UpcomingHero from '@/components/home/UpcomingHero';
import { EventbriteCardList } from '@/components/home/EventbriteCardList';
import { MOCK_EVENTS } from '@/lib/mockData';
import { Event } from '@/types';
import {
  Music, Palette, Heart,
  Sparkles, Plane, Gamepad2, Briefcase, UtensilsCrossed,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [location] = useState('Zimbabwe');
  const [page, setPage] = useState(1);

  const visible = MOCK_EVENTS.slice(0, Math.min(5, page * 5));

  return (
    <div className="min-h-screen pb-nav">

      <UpcomingHero events={MOCK_EVENTS} locationLabel={location.split(',')[0] || 'Zimbabwe'} />


      {/* ── CATEGORY ICONS ROW ── */}
      <section className="relative z-10" style={{ background: 'var(--bg)' }}>
        <div className="container pb-16 sm:pb-20">
          <div className="flex items-start justify-between overflow-x-auto scrollbar-hide gap-2 pb-1">
            {[
              { id: 'music',    label: 'Music',              icon: Music,   grad: 'linear-gradient(135deg,#FF55C2,#7222E3)' },
              { id: 'nightlife',label: 'Nightlife',          icon: Sparkles,grad: 'linear-gradient(135deg,#7222E3,#4F46E5)' },
              { id: 'arts',     label: 'Performing &\nVisual Arts', icon: Palette, grad: 'linear-gradient(135deg,#2CC4EA,#533885)' },
              { id: 'holidays', label: 'Holidays',           icon: Plane,   grad: 'linear-gradient(135deg,#46FFAB,#2CC4EA)' },
              { id: 'dating',   label: 'Dating',             icon: Heart,   grad: 'linear-gradient(135deg,#FF6B6B,#FF55C2)' },
              { id: 'hobbies',  label: 'Hobbies',            icon: Gamepad2,grad: 'linear-gradient(135deg,#FFBC73,#FF6B6B)' },
              { id: 'business', label: 'Business',           icon: Briefcase,grad:'linear-gradient(135deg,#1D5BFF,#2CC4EA)' },
              { id: 'food',     label: 'Food & Drink',       icon: UtensilsCrossed, grad: 'linear-gradient(135deg,#46FFAB,#1D5BFF)' },
            ].map(({ id, label, icon: Icon, grad }, i) => (
              <motion.button
                key={id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: i * 0.055, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => router.push(`/events?cat=${id}`)}
                className="flex flex-col items-center gap-2.5 shrink-0 group"
                style={{ minWidth: '72px' }}
              >
                {/* Circle */}
                <div
                  className="w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1.5px solid var(--border)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Icon using the category gradient colour */}
                  <div
                    style={{
                      background: grad,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      display: 'flex',
                    }}
                  >
                    <Icon size={26} strokeWidth={1.6} style={{ color: 'inherit' }} />
                  </div>
                </div>

                {/* Label */}
                <span
                  className="text-[12px] font-bold text-center leading-tight whitespace-pre-line"
                  style={{ color: 'var(--text)' }}
                >
                  {label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRENDING CATEGORIES ── */}
      <section className="section-pad-sm relative z-10 pt-14 sm:pt-20" style={{ background: 'var(--bg)' }}>
        <div className="container">
          {/* Section header — Ticketbay: 18px bold, left-aligned, no heavy subtitle */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">What&apos;s Hot Right Now</h2>
            <Link
              href="/events"
              className="self-start md:self-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-[var(--text)] text-sm font-medium shrink-0"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>

          {/* Category card grid */}
          <div className="bg-gray-50 dark:bg-[#12121c] border border-gray-200 dark:border-white/5 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-muted)]">Browse by Category</h3>
              <Link
                href="/events"
                className="hidden sm:flex items-center gap-1 text-blue-500 text-xs font-semibold"
              >
                See all <ArrowRight size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <CategoryCard
                title="Live Music" desc="Concerts, festivals, and late-night sets."
                img="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=600&auto=format&fit=crop"
              />
              <CategoryCard
                title="Art & Culture" desc="Galleries, theater, and creative showcases."
                img="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop"
              />
              <CategoryCard
                title="Arena Action" desc="Big games, live matches, and fan zones."
                img="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=600&auto=format&fit=crop"
              />
              <CategoryCard
                title="Taste Tours" desc="Pop-ups, tastings, and culinary experiences."
                img="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=600&auto=format&fit=crop"
              />
            </div>
            <Link href="/events" className="sm:hidden flex items-center gap-1 mt-3 text-blue-500 text-xs font-semibold">
              See all events <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── UPCOMING EVENTS LIST ── */}
      <section className="section-pad-sm relative z-10 border-t border-gray-200 dark:border-white/5" style={{ background: 'var(--bg)' }}>
        <div className="container">
          {/* Section header — Ticketbay style: 18px left, View all → text link right */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">Upcoming Events</h2>
            <Link
              href="/events"
              className="flex items-center gap-1 text-blue-500 text-xs font-semibold"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {visible.map((ev, i) => (
              <EventbriteCardList key={ev.id} event={ev} />
            ))}
          </div>

          {visible.length < Math.min(5, MOCK_EVENTS.length) && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-6 py-2.5 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-[var(--text)] text-sm font-medium"
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

            <div className="card rounded-2xl md:rounded-3xl p-5 md:p-10 overflow-hidden relative group">
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(1200px 600px at 20% 0%, rgba(255,85,194,0.10), transparent 60%), radial-gradient(1200px 600px at 80% 100%, rgba(114,34,227,0.10), transparent 55%)' }}
              />
              <div className="relative z-10 flex flex-col gap-3">
                <span className="badge badge-grad self-start">FOR ORGANIZERS</span>
                <h3 className="text-xl md:text-2xl font-black text-[var(--text)] tracking-tight">Host Your Next Event</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Create events, manage ticket sales, and track analytics in real-time with our powerful organizer tools.
                </p>
                <div className="pt-1">
                  <Link href="/dashboard" className="btn btn-lg btn-grad text-white">Go to Dashboard</Link>
                </div>
              </div>
            </div>

            <div className="card rounded-2xl md:rounded-3xl p-5 md:p-10 overflow-hidden relative group">
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(1200px 600px at 25% 0%, rgba(44,196,234,0.10), transparent 60%), radial-gradient(1200px 600px at 75% 100%, rgba(29,91,255,0.10), transparent 55%)' }}
              />
              <div className="relative z-10 flex flex-col gap-3">
                <span className="badge badge-info self-start text-blue-500">FOR FANS</span>
                <h3 className="text-xl md:text-2xl font-black text-[var(--text)] tracking-tight">Join the VIP Club</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Earn points on every ticket, get exclusive early access, and unlock special badges as you explore.
                </p>
                <div className="pt-1">
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

function CategoryCard({ title, desc, img }: { title: string, desc: string, img: string }) {
  return (
    <Link href="/events" className="group relative rounded-2xl overflow-hidden block" style={{ height: 'clamp(160px, 28vw, 280px)' }}>
      <img src={img} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      {/* Stronger gradient for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />
      <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end">
        <span className="text-[10px] font-bold text-white/70 tracking-[0.12em] mb-1 uppercase">{title.split(' ')[0]}</span>
        <h4 className="text-white font-black text-lg sm:text-xl leading-tight mb-1">{title}</h4>
        <p className="text-white/75 text-xs sm:text-sm leading-snug mb-2 sm:mb-3 line-clamp-1">{desc}</p>
        <span className="inline-flex items-center gap-1.5 text-white text-sm font-bold group-hover:gap-3 transition-all duration-300">
          Explore <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}
