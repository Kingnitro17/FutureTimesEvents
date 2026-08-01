'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Music2,
  Trophy,
  Sparkles,
  Utensils,
  Palette,
  HeartPulse,
  Grid2X2,
} from 'lucide-react';

type Category = {
  id: string;
  label: string;
  href: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  emoji?: string;
  gradient: string;
};

const CATS: Category[] = [
  { id: 'all', label: 'All', href: '/events', Icon: Grid2X2, gradient: 'linear-gradient(135deg, rgba(255,85,194,0.28), rgba(114,34,227,0.22))' },
  { id: 'music', label: 'Music', href: '/events', Icon: Music2, gradient: 'linear-gradient(135deg, rgba(255,85,194,0.34), rgba(114,34,227,0.26))' },
  { id: 'sports', label: 'Sports', href: '/events', Icon: Trophy, emoji: '⚽', gradient: 'linear-gradient(135deg, rgba(44,196,234,0.30), rgba(83,56,133,0.24))' },
  { id: 'nightlife', label: 'Nightlife', href: '/events', Icon: Sparkles, gradient: 'linear-gradient(135deg, rgba(29,91,255,0.30), rgba(199,254,23,0.16))' },
  { id: 'food', label: 'Food', href: '/events', Icon: Utensils, gradient: 'linear-gradient(135deg, rgba(255,188,115,0.32), rgba(255,0,185,0.20))' },
  { id: 'art', label: 'Art', href: '/events', Icon: Palette, gradient: 'linear-gradient(135deg, rgba(221,31,255,0.26), rgba(36,216,251,0.20))' },
  { id: 'wellness', label: 'Wellness', href: '/events', Icon: HeartPulse, gradient: 'linear-gradient(135deg, rgba(70,255,171,0.26), rgba(160,46,255,0.18))' },
];

export default function CategoryMarquee() {
  const railRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const hoveredRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current != null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const resumeAfterInteraction = () => {
    if (resumeTimerRef.current != null) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      if (!hoveredRef.current && !railRef.current?.matches(':focus-within')) {
        pausedRef.current = false;
      }
    }, 5000);
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let direction = 1;
    let frame = 0;
    let previousTime = performance.now();

    const move = (time: number) => {
      const elapsed = Math.min(time - previousTime, 50);
      previousTime = time;

      if (!reducedMotion.matches && !pausedRef.current) {
        const maxScroll = rail.scrollWidth - rail.clientWidth;
        if (maxScroll > 0) {
          rail.scrollLeft += direction * elapsed * 0.018;
          if (rail.scrollLeft >= maxScroll - 1) direction = -1;
          if (rail.scrollLeft <= 1) direction = 1;
        }
      }

      frame = window.requestAnimationFrame(move);
    };

    frame = window.requestAnimationFrame(move);
    return () => {
      window.cancelAnimationFrame(frame);
      if (resumeTimerRef.current != null) window.clearTimeout(resumeTimerRef.current);
    };
  }, []);

  return (
    <section className="relative">
      <div
        className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 rounded-[2rem]"
        style={{
          background:
            'radial-gradient(1200px 520px at 15% 20%, rgba(255,85,194,0.10), transparent 60%), radial-gradient(1200px 520px at 85% 80%, rgba(44,196,234,0.10), transparent 60%)',
        }}
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="flex items-end justify-between gap-6 mb-6">
            <div className="max-w-[640px]">
              <p className="type-caption uppercase tracking-[0.15em] font-bold text-[var(--accent)] mb-2">Categories</p>
              <h2 className="font-black tracking-tight text-[var(--text)] mb-4" style={{ fontSize: 'clamp(1.25rem, 3vw + 0.8rem, 2.25rem)' }}>
                Browse by <span style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>vibe</span>
              </h2>
            </div>
          </div>

          <div className="relative pb-8 sm:pb-12">
            <div className="absolute inset-y-0 left-0 w-10 sm:w-16 pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, var(--bg) 0%, transparent 100%)' }} />
            <div className="absolute inset-y-0 right-0 w-10 sm:w-16 pointer-events-none z-10" style={{ background: 'linear-gradient(270deg, var(--bg) 0%, transparent 100%)' }} />

            <div
              ref={railRef}
              className="pill-scroll flex flex-nowrap gap-4 overflow-x-auto overflow-y-hidden scroll-smooth pb-2 pr-10 sm:pr-16"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorInline: 'contain',
                paddingBottom: 'var(--sp-2)',
                paddingRight: 'var(--sp-6)',
                touchAction: 'pan-x',
              }}
              tabIndex={0}
              role="region"
              aria-label="Browse event interests. Scroll horizontally for more categories."
              onPointerDown={pause}
              onPointerUp={resumeAfterInteraction}
              onPointerCancel={resumeAfterInteraction}
              onWheel={() => {
                pause();
                resumeAfterInteraction();
              }}
              onMouseEnter={() => {
                hoveredRef.current = true;
                pause();
              }}
              onMouseLeave={() => {
                hoveredRef.current = false;
                resumeAfterInteraction();
              }}
              onFocusCapture={pause}
              onBlurCapture={resumeAfterInteraction}
            >
              {CATS.map(c => (
                <Link
                  key={c.id}
                  href={c.id === 'all' ? c.href : `${c.href}?cat=${encodeURIComponent(c.id)}`}
                  className="shrink-0 snap-start"
                >
                  <div className="card rounded-3xl p-4 sm:p-6 min-w-[210px] sm:min-w-[240px] overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.55]" style={{ background: 'radial-gradient(900px 300px at 50% -20%, rgba(255,255,255,0.10), transparent 60%)' }} />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/10"
                        style={{ background: c.gradient, boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}
                      >
                        {c.emoji
                          ? <span className="text-xl leading-none" aria-hidden="true">{c.emoji}</span>
                          : <c.Icon size={18} className="text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text)]">{c.label}</p>
                        <p className="type-caption text-[var(--text-muted)]">Curated picks</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

