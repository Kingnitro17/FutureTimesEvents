'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Music,
  Sparkles,
  Palette,
  Plane,
  Heart,
  Gamepad2,
  Briefcase,
  UtensilsCrossed,
} from 'lucide-react';

type Category = {
  id: string;
  label: string;
  href: string;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  emoji?: string;
  gradient: string;
};

const CATS: Category[] = [
  { id: 'music', label: 'Music', href: '/events', Icon: Music, gradient: 'linear-gradient(135deg,#FF55C2,#7222E3)' },
  { id: 'nightlife', label: 'Nightlife', href: '/events', Icon: Sparkles, gradient: 'linear-gradient(135deg,#7222E3,#4F46E5)' },
  { id: 'arts', label: 'Performing & Visual Arts', href: '/events', Icon: Palette, gradient: 'linear-gradient(135deg,#2CC4EA,#533885)' },
  { id: 'holidays', label: 'Holidays', href: '/events', Icon: Plane, gradient: 'linear-gradient(135deg,#46FFAB,#2CC4EA)' },
  { id: 'dating', label: 'Dating', href: '/events', Icon: Heart, gradient: 'linear-gradient(135deg,#FF6B6B,#FF55C2)' },
  { id: 'hobbies', label: 'Hobbies', href: '/events', Icon: Gamepad2, gradient: 'linear-gradient(135deg,#FFBC73,#FF6B6B)' },
  { id: 'business', label: 'Business', href: '/events', Icon: Briefcase, gradient: 'linear-gradient(135deg,#1D5BFF,#2CC4EA)' },
  { id: 'food', label: 'Food & Drink', href: '/events', Icon: UtensilsCrossed, gradient: 'linear-gradient(135deg,#46FFAB,#1D5BFF)' },
  { id: 'sports', label: 'Sports', href: '/events', emoji: '⚽', gradient: 'linear-gradient(135deg,#2CC4EA,#533885)' },
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
      if (!hoveredRef.current) {
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
    <section className="relative z-10" style={{ paddingBlock: 'var(--sp-6)' }}>
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg)] via-[var(--bg-secondary)] to-[var(--bg)] opacity-50" />

      <div className="container relative z-10" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="section-title">
          <span className="overline">Browse by interest</span>
          <h2>Event Categories</h2>
        </div>
      </div>

      <div className="relative z-10">
        <div className="absolute inset-y-0 left-0 w-10 sm:w-16 pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, var(--bg) 0%, transparent 100%)' }} />
        <div className="absolute inset-y-0 right-0 w-10 sm:w-16 pointer-events-none z-10" style={{ background: 'linear-gradient(270deg, var(--bg) 0%, transparent 100%)' }} />

        <div
          ref={railRef}
          className="flex flex-nowrap gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorInline: 'contain',
            paddingInline: 'max(var(--sp-3), calc((100vw - 1280px) / 2 + var(--sp-3)))',
            paddingBlock: 'var(--sp-2)',
            scrollBehavior: 'auto',
            scrollSnapType: 'none',
            touchAction: 'pan-x',
          }}
          tabIndex={0}
          role="region"
          aria-label="Event categories. Swipe or scroll horizontally to explore."
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
          {CATS.map(c => {
            const Icon = c.Icon;
            return (
              <Link
                key={c.id}
                href={`${c.href}?cat=${encodeURIComponent(c.id)}`}
                className="group flex shrink-0 flex-col items-center gap-2 rounded-2xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ flex: '0 0 auto', inlineSize: 'clamp(5.75rem, 24vw, 7.5rem)', padding: 'var(--sp-2)' }}
              >
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:-translate-y-0.5 sm:h-20 sm:w-20"
                  style={{ background: c.gradient, boxShadow: 'var(--shadow-sm)' }}
                >
                  {c.emoji
                    ? <span className="text-3xl leading-none" aria-hidden="true">{c.emoji}</span>
                    : Icon && <Icon size={28} className="text-white" />}
                </div>
                <span className="w-full text-xs font-extrabold leading-tight text-[var(--text)] sm:text-sm">
                  {c.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

