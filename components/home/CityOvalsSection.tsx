'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEvents } from '@/lib/useEvents';

// ─── Dataset ──────────────────────────────────────────────────────────────────
// subtitle field removed — taglines (Corn-Belt, Sunshine City, City of Kings etc.)
// are no longer shown in oval cards per production spec.
const CITIES = [
  { slug: 'shamva', name: 'Shamva', emoji: '🌿', image: '/cities/Shamva.jpeg' },
  { slug: 'bindura', name: 'Bindura', emoji: '🍃', image: '/cities/Bindura.jpeg' },
  { slug: 'harare', name: 'Harare', emoji: '🏙️', image: '/cities/Harare.jpg' },
  { name: 'Bulawayo',            status: 'Coming soon', emoji: '🦏',  image: '/cities/Bulawayo.jpg' },
  { name: 'Mutare',              status: 'Coming soon', emoji: '⛰️', image: '/cities/Mutare.jpeg' },
  { name: 'Gweru',               status: 'Coming soon', emoji: '🌾',  image: '/cities/Gweru.jpeg' },
  { name: 'Victoria Falls',      status: 'Coming soon', emoji: '🌊',  image: '/cities/Victoria_falls.jpg' },
  { name: 'Chinhoyi',            status: 'Coming soon', emoji: '💎',  image: '/cities/Chinhoyi.jpeg' },
  { name: 'Marondera',           status: 'Coming soon', emoji: '🍊',  image: '/cities/Marondera.jpeg' },
  { name: 'Kadoma',              status: 'Coming soon', emoji: '⛏️', image: '/cities/Kadoma.jpeg' },
  { name: 'Kwekwe',              status: 'Coming soon', emoji: '🔩',  image: '/cities/Kwekwe.jpg' },
  { name: 'Kariba',              status: 'Coming soon', emoji: '🐊',  image: '/cities/Kariba.jpeg' },
  { name: 'Masvingo',            status: 'Coming soon', emoji: '🏛️', image: '/cities/Masvingo.jpg' },
  { name: 'Zvishavane',          status: 'Coming soon', emoji: '💠',  image: '/cities/Zvishavane.jpg' },
  { name: 'Chegutu',             status: 'Coming soon', emoji: '🌻',  image: '/cities/Chegutu.jpg' },
  { name: 'Chitungwiza',         status: 'Coming soon', emoji: '🏘️', image: '/cities/Chitungwiza.webp' },
  { name: 'Glendale',            status: 'Coming soon', emoji: '🌄',  image: '/cities/Glandale.png' },
  { name: 'Mazowe',              status: 'Coming soon', emoji: '🍊',  image: '/cities/Mazowe.jpeg' },
].map(city => ({ ...city, slug: 'slug' in city ? city.slug : city.name.toLowerCase().replaceAll(' ', '-') }));

type City = (typeof CITIES)[number] & { eventCount: number };

// ─── Single card ──────────────────────────────────────────────────────────────
function CityCard({ city, index }: { city: City; index: number }) {
  const status = city.eventCount > 0
    ? `${city.eventCount} event${city.eventCount === 1 ? '' : 's'}`
    : 'Coming soon';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: Math.min(index * 0.05, 0.35), duration: 0.45, ease: 'easeOut' }}
      className="snap-start shrink-0"
    >
      <Link
        href={`/events?city=${encodeURIComponent(city.name)}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-full"
        tabIndex={0}
        aria-label={`Explore events in ${city.name} — ${status}`}
      >
        {/* Outer oval — clips everything to pill shape */}
        <div
          className="relative overflow-hidden transition-all duration-300 ease-out
            shadow-[0_8px_24px_rgba(0,0,0,0.10)]
            hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)]
            hover:scale-[1.03]
            border border-white/20
            rounded-full
            w-[136px] h-[218px] sm:w-[180px] sm:h-[272px]"
        >
          {/* Full-cover background image */}
          <Image
            src={city.image}
            alt={city.name}
            fill
            sizes="(max-width: 640px) 136px, 180px"
            className="object-cover object-center"
            priority={index < 4}
            draggable={false}
          />

          {/* Dark gradient overlay — bottom two-thirds */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 52%, transparent 100%)',
            }}
          />

          {/* Explore badge — top badge */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <div
              className="text-white text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md whitespace-nowrap flex items-center gap-1"
              style={{ background: 'var(--accent)' }}
            >
              <span className="text-sm" aria-hidden="true">{city.emoji}</span>
              <span>Explore</span>
            </div>
          </div>

          {/* Bottom text — directly on the image gradient */}
          <div className="absolute inset-x-0 top-[34%] bottom-[12%] z-10 flex flex-col items-center justify-center text-center px-4 sm:px-5">
            <p
              className="font-extrabold leading-tight text-white w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
              style={{ fontSize: 'clamp(1.125rem, 2vw + 0.7rem, 1.5rem)', overflowWrap: 'anywhere' }}
            >
              {city.name}
            </p>
            <p
              className="font-semibold uppercase tracking-wider mt-2 leading-4 whitespace-nowrap"
              style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.88)' }}
            >
              {status}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export default function CityOvalsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { events } = useEvents();

  const cities = CITIES.map(city => ({
    ...city,
    eventCount: events.filter(event => event.city.trim().toLowerCase() === city.name.toLowerCase()).length,
  }));

  // Live-event cities first
  const sorted = [
    ...cities.filter(city => city.eventCount > 0),
    ...cities.filter(city => city.eventCount === 0),
  ];

  return (
    <section className="relative py-12 sm:py-16">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center mb-8 sm:mb-10"
        >
          <span className="type-overline text-[var(--text-muted)] mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} aria-hidden="true" />
            Top Destinations
          </span>
          <h2
            className="font-display font-extrabold text-[var(--text)] max-w-xl leading-tight tracking-tight mb-3 mx-auto"
            style={{ fontSize: 'clamp(1.25rem, 2.5vw + 0.8rem, 2rem)' }}
          >
            Explore Zimbabwe&apos;s Most Loved Places
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
            Tap a city to discover what&apos;s happening near you.
          </p>
        </motion.div>
      </div>

      {/* Scroll rail — full-bleed */}
      <div className="relative mt-2">
        {/* Left fade */}
        <div
          className="absolute inset-y-0 left-0 w-10 sm:w-16 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, var(--bg) 0%, transparent 100%)' }}
        />
        {/* Right fade */}
        <div
          className="absolute inset-y-0 right-0 w-10 sm:w-16 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(270deg, var(--bg) 0%, transparent 100%)' }}
        />

        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
          style={{
            paddingInline: 'max(1rem, calc((100vw - 1280px) / 2 + 1rem))',
            paddingBlock: '12px',
          }}
          onMouseDown={(e) => {
            const slider = e.currentTarget;
            slider.dataset.isDown = 'true';
            slider.dataset.startX = (e.pageX - slider.offsetLeft).toString();
            slider.dataset.scrollLeft = slider.scrollLeft.toString();
          }}
          onMouseLeave={(e) => {
            e.currentTarget.dataset.isDown = 'false';
          }}
          onMouseUp={(e) => {
            e.currentTarget.dataset.isDown = 'false';
          }}
          onMouseMove={(e) => {
            const slider = e.currentTarget;
            if (slider.dataset.isDown !== 'true') return;
            e.preventDefault();
            const startX = parseFloat(slider.dataset.startX || '0');
            const scrollLeft = parseFloat(slider.dataset.scrollLeft || '0');
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
          }}
        >
          {sorted.map((city, i) => (
            <CityCard key={city.name} city={city} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
