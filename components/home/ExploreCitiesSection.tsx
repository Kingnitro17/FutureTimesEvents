'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, ArrowUpRight } from 'lucide-react';
import type { Event } from '@/types';

// ─── Zimbabwe cities with metadata ────────────────────────────────────────────
// Gradient colors are hand-picked for visual variety + harmony.
const ZIM_CITIES = [
  { name: 'Harare',     emoji: '🏙️', grad: 'linear-gradient(135deg, #FF55C2, #7222E3)',  tagline: 'The Sunshine City' },
  { name: 'Bulawayo',   emoji: '🦏',  grad: 'linear-gradient(135deg, #2CC4EA, #533885)',  tagline: 'City of Kings' },
  { name: 'Mutare',     emoji: '⛰️', grad: 'linear-gradient(135deg, #46FFAB, #A02EFF)',  tagline: 'Gateway to the East' },
  { name: 'Gweru',      emoji: '🌾',  grad: 'linear-gradient(135deg, #FFBC73, #FF00B9)',  tagline: 'Heart of the Midlands' },
  { name: 'Masvingo',   emoji: '🏛️', grad: 'linear-gradient(135deg, #1D5BFF, #C7FE17)',  tagline: 'Home of Great Zimbabwe' },
  { name: 'Chinhoyi',   emoji: '💎',  grad: 'linear-gradient(135deg, #00D2FF, #3A7BD5)',  tagline: 'Chinhoyi Caves' },
  { name: 'Marondera',  emoji: '🍊',  grad: 'linear-gradient(135deg, #F7971E, #FFD200)',  tagline: 'Orchard Country' },
  { name: 'Kadoma',     emoji: '⛏️', grad: 'linear-gradient(135deg, #C471ED, #12CBC4)',  tagline: 'Golden City' },
  { name: 'Shamva',     emoji: '🌿',  grad: 'linear-gradient(135deg, #11998E, #38EF7D)',  tagline: 'Heart of Mashonaland' },
  { name: 'Bindura',    emoji: '🍃',  grad: 'linear-gradient(135deg, #5C258D, #4389A2)',  tagline: 'Nickel City' },
  { name: 'Kwekwe',     emoji: '🔩',  grad: 'linear-gradient(135deg, #E44D26, #F16529)',  tagline: 'Steel Town' },
  { name: 'Victoria Falls', emoji: '🌊', grad: 'linear-gradient(135deg, #667EEA, #764BA2)', tagline: 'Smoke That Thunders' },
  { name: 'Kariba',     emoji: '🐊',  grad: 'linear-gradient(135deg, #0CEBEB, #20E3B2)',  tagline: 'Lake Kariba' },
  { name: 'Zvishavane', emoji: '💠',  grad: 'linear-gradient(135deg, #B24592, #F15F79)',  tagline: 'Platinum Province' },
  { name: 'Chegutu',    emoji: '🌻',  grad: 'linear-gradient(135deg, #F09819, #EDDE5D)',  tagline: 'Cotton Capital' },
  { name: 'Chitungwiza', emoji: '🏘️', grad: 'linear-gradient(135deg, #FF6B6B, #556270)', tagline: 'Chi-Town' },
];

// Stagger animation per card
const cardVariants: any = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.04,
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function ExploreCitiesSection({ events }: { events: Event[] }) {
  // Count events per city (case-insensitive match on event.city or event.venue)
  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const city of ZIM_CITIES) {
      const lc = city.name.toLowerCase();
      counts[city.name] = events.filter(
        (ev) =>
          ev.city?.toLowerCase() === lc ||
          ev.venue?.toLowerCase().includes(lc) ||
          ev.address?.toLowerCase().includes(lc)
      ).length;
    }
    return counts;
  }, [events]);

  return (
    <section className="relative z-10 section-pad overflow-hidden">
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, var(--bg) 0%, var(--bg-secondary) 40%, var(--bg-secondary) 60%, var(--bg) 100%)',
        }}
      />

      <div className="container relative z-10">
        {/* Header */}
        <div className="section-title mb-8 sm:mb-10">
          <span className="overline">Explore events near you</span>
          <h2>Popular Cities</h2>
          <p
            className="caption mt-2"
            style={{ color: 'var(--text-muted)', maxWidth: '480px' }}
          >
            Discover what's happening across Zimbabwe — from the capital to the
            falls.
          </p>
        </div>

        {/* City Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {ZIM_CITIES.map((city, i) => {
            const count = cityCounts[city.name] ?? 0;
            return (
              <motion.div
                key={city.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={cardVariants}
              >
                <Link
                  href={`/events?city=${encodeURIComponent(city.name)}`}
                  className="group relative block rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {/* Gradient top stripe */}
                  <div
                    className="h-2 sm:h-2.5 w-full transition-all duration-300 group-hover:h-3 sm:group-hover:h-3.5"
                    style={{ background: city.grad }}
                  />

                  {/* Card body */}
                  <div className="px-4 sm:px-5 py-4 sm:py-5 flex flex-col gap-2 sm:gap-3">
                    {/* Emoji + Name row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <span className="text-xl sm:text-2xl shrink-0">{city.emoji}</span>
                        <div className="min-w-0">
                          <h3
                            className="text-sm sm:text-base font-black tracking-tight truncate group-hover:text-[var(--accent)] transition-colors duration-300"
                            style={{ color: 'var(--text)' }}
                          >
                            {city.name}
                          </h3>
                          <p
                            className="text-[10px] sm:text-xs font-medium truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {city.tagline}
                          </p>
                        </div>
                      </div>
                      <motion.div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-1 group-hover:translate-x-0"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                      >
                        <ArrowUpRight size={14} className="sm:w-4 sm:h-4" />
                      </motion.div>
                    </div>

                    {/* Event count chip */}
                    <div className="flex items-center gap-1.5">
                      <MapPin
                        size={11}
                        className="sm:w-3 sm:h-3 shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                      />
                      <span
                        className="text-[11px] sm:text-xs font-semibold"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {count === 0
                          ? 'Coming soon'
                          : `${count} event${count !== 1 ? 's' : ''}`}
                      </span>
                      {count > 0 && (
                        <span
                          className="ml-auto text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${city.grad.match(/#[a-fA-F0-9]{6}/)?.[0] ?? 'var(--accent)'}18`,
                            color: city.grad.match(/#[a-fA-F0-9]{6}/)?.[0] ?? 'var(--accent)',
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover glow overlay */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(600px 400px at 50% 0%, ${
                        city.grad.match(/#[a-fA-F0-9]{6}/)?.[0] ?? '#7222E3'
                      }08, transparent 60%)`,
                    }}
                  />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
