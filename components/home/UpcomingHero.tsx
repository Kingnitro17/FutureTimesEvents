'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { Calendar, MapPin, ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import type { Event } from '@/types';

function clampIndex(i: number, len: number) {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}

function formatPrice(ev: Event) {
  return ev.price === 0 ? 'Free' : ev.priceLabel || `$${ev.price}`;
}

export default function UpcomingHero({
  events,
  locationLabel = 'Zimbabwe',
}: {
  events: Event[];
  locationLabel?: string;
}) {
  const items = useMemo(() => events.slice(0, 6), [events]);
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      setDir(1);
      setActive(i => clampIndex(i + 1, items.length));
    }, 5200);
    return () => window.clearInterval(id);
  }, [items.length]);

  const ev = items[clampIndex(active, items.length)];
  const go = (next: number) => {
    const n = clampIndex(next, items.length);
    setDir(n > active ? 1 : -1);
    setActive(n);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x;
    const velocity = info.velocity.x;
    if (swipe < -70 || velocity < -500) go(active + 1);
    if (swipe > 70 || velocity > 500) go(active - 1);
  };

  if (!ev) return null;

  return (
    /*
     * FIX 1: Gap after header
     * pt-[var(--nav-h)] places content right under the nav.
     * Adding py-3 sm:py-5 INSIDE the outer wrapper (below the nav offset)
     * creates breathing room between the nav and the hero card.
     */
    <section className="relative" style={{ paddingTop: 'var(--nav-h)' }}>
      {/* Ambient blurred background — clipped to prevent mobile overflow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={ev.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="absolute inset-0"
          aria-hidden
        >
          {/* Blur wrapper — standard inset-0, section padding creates the fade zone */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              style={{
                position: 'absolute',
                inset: '-8%',
                backgroundImage: `url(${ev.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(42px) saturate(1.15) contrast(1.05)',
                opacity: 0.75,
              }}
            />
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(1200px 640px at 18% 8%, rgba(255,255,255,0.10), transparent 60%), radial-gradient(900px 520px at 82% 72%, rgba(114,34,227,0.22), transparent 58%), linear-gradient(180deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.62) 55%, var(--bg) 98%)',
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Bottom fade — ONLY fades the ambient bg area below the card into var(--bg) */}
      {/* The hero card itself is above z-10, completely unaffected */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: 'linear-gradient(to bottom, transparent 0%, var(--bg) 100%)',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />

      {/* Thin gap strip */}
      <div className="relative z-10 w-full h-4" />

      {/* Hero content */}
      <div className="relative z-10 w-full pb-6 sm:pb-12">
        <div className="container">
          <div className="relative">

            {/* ── HERO CARD ── */}
            {/* overflow-hidden removed from here — it was clipping the bottom bar */}
            {/* Image layer below carries its own overflow-hidden+border-radius to clip the bg image */}
            <div className="rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl relative">

              {/*
               * FIX 2: Text overlap prevention
               * Old structure had title + info panel as "relative z-20" inside a
               * flex-col justify-end container — the absolute-positioned image badges
               * (date/price top-left, category top-right) were overlapping the title
               * on mobile when titles are long.
               *
               * New structure:
               *  - Image fills the full card (absolute)
               *  - Gradient overlay (absolute)
               *  - Content is a flex-col with:
               *    · top row (badges) — absolute, safe zone reserved via pt
               *    · spacer (flex-1) pushes title to bottom
               *    · title + info bar at bottom, with enough padding
               *
               * On mobile we cap the title at 2 lines to prevent vertical overflow.
               */}
              <div className="relative flex flex-col justify-end" style={{ minHeight: 'clamp(420px, 68vh, 760px)' }}>

                {/* Image layer — overflow-hidden lives HERE so the bg image clips to rounded corners */}
                {/* This does NOT clip the bottom bar because the bar is rendered OUTSIDE this div */}
                <div className="absolute inset-0 overflow-hidden rounded-[2rem] sm:rounded-[2.5rem]">
                  <AnimatePresence mode="wait" custom={dir}>
                    <motion.div
                      key={ev.id}
                      custom={dir}
                      initial={{ opacity: 0, x: dir * 22, scale: 0.988 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: dir * -22, scale: 0.988 }}
                      transition={{ duration: 0.38, ease: 'easeOut' }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.12}
                      onDragEnd={onDragEnd}
                      className="absolute inset-0"
                    >
                      {/* Mobile image (portrait) */}
                      <div
                        className="absolute inset-0 sm:hidden"
                        style={{
                          backgroundImage: `url(${ev.image})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      {/* Desktop image (landscape) */}
                      <div
                        className="hidden sm:block absolute inset-0"
                        style={{
                          backgroundImage: `url(${ev.landscapeImage || ev.image})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Gradient overlay — stronger at bottom so text always readable */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.30) 40%, rgba(0,0,0,0.78) 72%, rgba(0,0,0,0.92) 100%)',
                    }}
                  />
                </div> {/* end image overflow-hidden wrapper */}

                {/* ── TOP BADGES (absolute, won't push layout) ── */}
                {/* Date + Price badge — top left */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
                  <div className="bg-black/60 backdrop-blur-xl border border-white/15 rounded-2xl px-6 py-4 shadow-xl min-w-[120px]">
                    <p className="text-[10px] tracking-widest mb-1 text-center font-bold uppercase" style={{ color: 'rgba(255,255,255,0.65)', letterSpacing: '0.12em' }}>DATE</p>
                    <p className="font-black leading-tight text-base sm:text-lg text-center whitespace-nowrap" style={{ color: '#ffffff' }}>
                      {ev.date}
                    </p>
                    <div className="my-2 w-full h-px bg-gradient-to-r from-white/20 to-transparent" />
                    <p className="text-[10px] tracking-widest mb-1 text-center font-bold uppercase" style={{ color: 'rgba(255,255,255,0.65)', letterSpacing: '0.12em' }}>FROM</p>
                    <p className="font-black leading-tight text-2xl sm:text-3xl text-center" style={{ color: '#ffffff' }}>
                      {formatPrice(ev)}
                    </p>
                  </div>
                </div>

                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
                  <div className="bg-black/50 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-3 min-w-[80px]">
                    <p className="font-bold text-xs tracking-widest text-center whitespace-nowrap uppercase" style={{ color: '#ffffff', letterSpacing: '0.12em' }}>{ev.categoryLabel}</p>
                  </div>
                </div>

                {/* ── PREV / NEXT ARROWS (centered vertically) ── */}
                <div className="absolute inset-x-4 sm:inset-x-6 top-1/2 -translate-y-1/2 pointer-events-none z-30">
                  <div className="flex items-center justify-between">
                    <button
                      aria-label="Previous event"
                      onClick={() => go(active - 1)}
                      className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border border-white/15 bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/70 hover:scale-110 active:scale-95"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      aria-label="Next event"
                      onClick={() => go(active + 1)}
                      className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border border-white/15 bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/70 hover:scale-110 active:scale-95"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                {/*
                 * ── BOTTOM CONTENT STACK ──
                 * Fixed: This is now a relative block so it expands the card height naturally
                 * if the text + buttons are taller than the minHeight.
                 */}
                <div className="relative z-20 flex flex-col justify-end mt-auto px-6 pb-6 sm:px-8 sm:pb-8">

                  {/* Text block — padded container keeps text clear of rounded corners */}
                  <div className="mb-4 pt-48 sm:pt-48">

                    {/* Big UPPERCASE title — wraps freely, centered */}
                    <motion.h2
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="font-black text-white !text-white leading-[1.08] mb-4 uppercase tracking-wide text-center"
                      style={{
                        fontSize: 'clamp(1.7rem, 7.5vw, 3.8rem)',
                        fontWeight: 900,
                        textShadow: '0 4px 28px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.8)',
                      }}
                    >
                      {ev.title}
                    </motion.h2>

                    {/* Venue + time — centred, bigger text */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
                      className="flex flex-col items-center gap-3 mb-6"
                    >
                      <div className="flex items-center gap-2 text-white/90">
                        <MapPin size={15} className="shrink-0" />
                        <span className="text-base font-semibold line-clamp-1">{ev.venue}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/90">
                        <Calendar size={15} className="shrink-0" />
                        <span className="text-base font-semibold">{ev.time} · {ev.date?.split(',')[0]}</span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Bottom bar — now safe, no overflow-hidden parent to clip it */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
                    className="flex items-center justify-center gap-6 p-5 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/15 mx-4"
                  >
                    {/* Price block — centered */}
                    <div className="flex-1 text-center">
                      <p className="text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>Starting from</p>
                      <p className="font-black text-2xl leading-none" style={{ color: '#ffffff' }}>
                        {formatPrice(ev)}
                      </p>
                    </div>

                    {/* Get Tickets button — same as EventbriteCard */}
                    <Link
                      href={`/events/${ev.id}`}
                      className="btn btn-md btn-primary flex items-center gap-2"
                    >
                      <Ticket size={16} /> Get Tickets <ChevronRight size={14} />
                    </Link>
                  </motion.div>

                  {/* Gap below */}
                  <div className="h-4" />

                </div>
              </div>
            </div>

            {/* Gap after hero card */}
            <div className="h-6" />

            {/* Slide indicator dots — improved UI */}
            <div className="flex items-center justify-center gap-3">
              {items.map((_, i) => (
                <motion.button
                  key={i}
                  aria-label={`Go to event ${i + 1}`}
                  onClick={() => go(i)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === active ? 'shadow-lg shadow-[var(--accent)]/30' : 'hover:bg-[var(--accent)]/50'
                  }`}
                  style={{
                    width: i === active ? 32 : 12,
                    background: i === active 
                      ? 'linear-gradient(135deg, var(--accent), #7222E3)' 
                      : 'var(--text-muted)',
                    opacity: i === active ? 1 : 0.3,
                  }}
                />
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
