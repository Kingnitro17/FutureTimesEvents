'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

// ─── Dataset ──────────────────────────────────────────────────────────────────
const CITIES = [
  { name: 'Shamva',         subtitle: 'Mashonaland North',      status: '1 event',     emoji: '🌿',  image: '/cities/Shamva.jpeg' },
  { name: 'Harare',         subtitle: 'The Sunshine City',      status: 'Coming soon', emoji: '🏙️', image: '/cities/Harare.jpg' },
  { name: 'Bulawayo',       subtitle: 'City of Kings',          status: 'Coming soon', emoji: '🦏',  image: '/cities/Bulawayo.jpg' },
  { name: 'Mutare',         subtitle: 'Gateway to the East',    status: 'Coming soon', emoji: '⛰️', image: '/cities/Mutare.jpeg' },
  { name: 'Gweru',          subtitle: 'Heart of Midlands',      status: 'Coming soon', emoji: '🌾',  image: '/cities/Gweru.jpeg' },
  { name: 'Bindura',        subtitle: 'Nickel City',            status: 'Coming soon', emoji: '🍃',  image: '/cities/Bindura.jpeg' },
  { name: 'Victoria Falls', subtitle: 'Smoke That Thunders',    status: 'Coming soon', emoji: '🌊',  image: '/cities/Victoria_falls.jpg' },
  { name: 'Chinhoyi',       subtitle: 'Chinhoyi Caves',         status: 'Coming soon', emoji: '💎',  image: '/cities/Chinhoyi.jpeg' },
  { name: 'Marondera',      subtitle: 'Orchard Country',        status: 'Coming soon', emoji: '🍊',  image: '/cities/Marondera.jpeg' },
  { name: 'Kadoma',         subtitle: 'Golden City',            status: 'Coming soon', emoji: '⛏️', image: '/cities/Kadoma.jpeg' },
  { name: 'Kwekwe',         subtitle: 'Steel Town',             status: 'Coming soon', emoji: '🔩',  image: '/cities/Kwekwe.jpg' },
  { name: 'Kariba',         subtitle: 'Lake Kariba',            status: 'Coming soon', emoji: '🐊',  image: '/cities/Kariba.jpeg' },
  { name: 'Masvingo',       subtitle: 'Great Zimbabwe',         status: 'Coming soon', emoji: '🏛️', image: '/cities/Masvingo.jpg' },
  { name: 'Zvishavane',     subtitle: 'Platinum Province',      status: 'Coming soon', emoji: '💠',  image: '/cities/Zvishavane.jpg' },
  { name: 'Chegutu',        subtitle: 'Cotton Capital',         status: 'Coming soon', emoji: '🌻',  image: '/cities/Chegutu.jpg' },
  { name: 'Chitungwiza',    subtitle: 'Chi-Town',               status: 'Coming soon', emoji: '🏘️', image: '/cities/Chitungwiza.webp' },
  { name: 'Glendale',       subtitle: 'Mazowe Valley',          status: 'Coming soon', emoji: '🌄',  image: '/cities/Glandale.png' },
  { name: 'Mazowe',         subtitle: 'Mazowe Valley',          status: 'Coming soon', emoji: '🍊',  image: '/cities/Mazowe.jpeg' },
];

// ─── Single card ──────────────────────────────────────────────────────────────
function CityCard({ city, index }: { city: typeof CITIES[0]; index: number }) {
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
        className="block focus:outline-none"
        tabIndex={0}
      >
        {/* Outer oval wrapper — clips everything to pill shape */}
        <div
          className="relative overflow-hidden transition-shadow duration-300 ease-out shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
          style={{ width: 190, height: 280, borderRadius: 9999 }}
        >
          {/* ── Full-cover background image ── */}
          <Image
            src={city.image}
            alt={city.name}
            fill
            sizes="190px"
            className="object-cover"
            priority={index < 4}
            draggable={false}
          />

          {/* ── TravelPerk-style Floating Bottom Box ── */}
          <div
            className="absolute inset-x-3 bottom-3 z-20 dark:bg-[#111] flex flex-col items-center rounded-t-[28px] rounded-b-[9999px]"
            style={{ height: '48%', backgroundColor: 'var(--bg-city-oval)' }}
          >
            {/* Overlapping top badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
              <div className="bg-[var(--accent)] text-white text-xs font-bold px-5 py-2 rounded-full uppercase tracking-widest shadow-md whitespace-nowrap flex items-center gap-1.5">
                <span className="text-sm">{city.emoji}</span>
                <span>Explore</span>
              </div>
            </div>

            {/* Inner Content Padding */}
            <div className="flex flex-col items-center justify-between w-full h-full pt-6 pb-6 px-3 text-center">
              
              <div className="flex flex-col items-center">
                {/* City name (First, Bigger) */}
                <p className="font-extrabold text-xl dark:text-white leading-tight truncate w-full mt-2 mb-1" style={{ color: 'var(--text)' }}>
                  {city.name}
                </p>

                {/* Event count (Second, Bigger) */}
                <p className="font-bold text-sm text-[var(--accent)] uppercase tracking-wider mb-2">
                  {city.status}
                </p>

                {/* Subtitle */}
                <p className="text-xs dark:text-gray-400 leading-snug w-full line-clamp-2 px-1" style={{ color: 'var(--text-muted)' }}>
                  {city.subtitle}
                </p>
              </div>

            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export default function CityOvalsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live-event cities first
  const sorted = [
    ...CITIES.filter(c => c.status !== 'Coming soon'),
    ...CITIES.filter(c => c.status === 'Coming soon'),
  ];

  return (
    <section className="relative py-12 sm:py-16" style={{ background: 'var(--bg)' }}>
      <div className="container">

        {/* ── Header (Centered) ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center mb-6 sm:mb-8"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            Top Destinations
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white max-w-2xl leading-tight tracking-tight mb-4">
            Explore Zimbabwe’s Most Loved Places.
          </h2>
          <p className="text-base text-gray-500 max-w-md">
            Tap a city to discover what’s happening near you.
          </p>
        </motion.div>
      </div>

      {/* ── Scroll rail — full-bleed with container-padded start ── */}
      <div className="relative mt-4 sm:mt-6">
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
          className="flex gap-5 sm:gap-6 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
          style={{
            paddingInline: 'max(1rem, calc((100vw - 1280px) / 2 + 1rem))',
            paddingBlock: '8px',
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
