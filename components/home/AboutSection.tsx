'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Users,
  Compass,
  Star,
  Ticket,
  Calendar,
  Sparkles,
  Heart,
} from 'lucide-react';

export default function AboutSection() {
  const shouldReduceMotion = useReducedMotion();

  const featureCards = [
    {
      id: 'identity',
      label: 'IDENTITY',
      title: 'Built to connect Zimbabwe',
      description:
        'We bring people together through unforgettable experiences that celebrate who we are.',
      number: '01',
      icon: Users,
      badgeColor: 'text-[#7222E3]',
      iconBg: 'bg-[#7222E3]',
      iconShadow: 'shadow-purple-500/25',
      cardBg:
        'bg-gradient-to-br from-purple-50/70 via-purple-50/30 to-white',
      borderColor: 'border-purple-100/90',
      numberColor: 'text-purple-900/10',
    },
    {
      id: 'vision',
      label: 'VISION',
      title: 'Make every event effortless',
      description:
        'To be Zimbabwe’s leading platform for discovering, booking and enjoying events anywhere.',
      number: '02',
      icon: Compass,
      badgeColor: 'text-[#2CC4EA]',
      iconBg: 'bg-[#2CC4EA]',
      iconShadow: 'shadow-cyan-500/25',
      cardBg:
        'bg-gradient-to-br from-cyan-50/70 via-cyan-50/30 to-white',
      borderColor: 'border-cyan-100/90',
      numberColor: 'text-cyan-900/10',
    },
    {
      id: 'values',
      label: 'VALUES',
      title: 'People first. Local culture.',
      description:
        'We value trust, real connections and experiences that empower our communities.',
      number: '03',
      icon: Star,
      badgeColor: 'text-[#FF9F43]',
      iconBg: 'bg-[#FF9F43]',
      iconShadow: 'shadow-amber-500/25',
      cardBg:
        'bg-gradient-to-br from-amber-50/70 via-amber-50/30 to-white',
      borderColor: 'border-amber-100/90',
      numberColor: 'text-amber-900/10',
    },
  ];

  const purposeSteps = [
    {
      icon: Ticket,
      title: 'Discover',
      subtitle: 'Amazing events',
    },
    {
      icon: Calendar,
      title: 'Book',
      subtitle: 'In just a few taps',
    },
    {
      icon: Sparkles,
      title: 'Experience',
      subtitle: 'Unforgettable moments',
    },
    {
      icon: Heart,
      title: 'Connect',
      subtitle: 'With your community',
    },
  ];

  return (
    <section
      className="relative section-pad-sm overflow-hidden"
      aria-labelledby="about-heading"
    >
      <div className="container relative z-10">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]"
          style={{
            padding: 'clamp(1.25rem, 4vw, 2.5rem)',
            boxSizing: 'border-box',
          }}
        >
          {/* Subtle brand glow behind container */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-10 blur-3xl"
            style={{ background: 'var(--grad-primary)' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full opacity-10 blur-3xl"
            style={{ background: 'var(--grad-ocean)' }}
          />

          <div className="relative z-10">
            {/* ── 1. ABOUT US EYEBROW LABEL ── */}
            <div className="mb-4 sm:mb-6">
              <span
                className="type-overline inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold tracking-[0.15em] uppercase"
                style={{
                  color: 'var(--accent)',
                  backgroundColor: 'rgba(114, 34, 227, 0.08)',
                }}
              >
                ABOUT US
              </span>
            </div>

            {/* ── 2. MAIN HERO AREA (Heading, Paragraph, Transparent Logo) ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center mb-8 sm:mb-12">
              {/* Text content */}
              <div className="md:col-span-7 min-w-0">
                <h2
                  id="about-heading"
                  className="font-display font-black leading-[1.14] tracking-tight text-[var(--text)] mb-4 sm:mb-5"
                  style={{ fontSize: 'clamp(1.6rem, 3.2vw + 0.8rem, 2.85rem)' }}
                >
                  Our Identity,{' '}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #FF55C2, #7222E3)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Vision
                  </span>{' '}
                  &amp; Values
                </h2>
                <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] max-w-xl font-normal">
                  Future Times Events connects people through unforgettable
                  entertainment, cultural experiences and community moments
                  across Zimbabwe. We make it easy to discover events, reserve
                  tickets and create lasting memories.
                </p>
              </div>

              {/* Logo — Centered on mobile below intro, right-aligned on desktop */}
              <div className="md:col-span-5 flex items-center justify-center md:justify-end shrink-0 pt-4 md:pt-0 bg-transparent border-0 shadow-none outline-none">
                <Image
                  src="/assets/nobglogo.png"
                  alt="Future Times Events Logo"
                  width={250}
                  height={220}
                  priority={false}
                  className="w-44 sm:w-56 lg:w-64 h-auto object-contain max-h-56 bg-transparent border-0 shadow-none outline-none pointer-events-none select-none"
                />
              </div>
            </div>

            {/* ── 3. FEATURE CARDS (Identity, Vision, Values) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-8 sm:mb-12">
              {featureCards.map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    className={`relative overflow-hidden rounded-[var(--r-2xl)] border ${card.borderColor} ${card.cardBg} transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
                    style={{
                      padding: 'clamp(1.25rem, 3.5vw, 1.75rem)',
                      boxSizing: 'border-box',
                      minWidth: 0,
                    }}
                  >
                    {/* Decorative Number */}
                    <span
                      aria-hidden="true"
                      className={`absolute top-5 right-6 text-3xl sm:text-4xl font-extrabold select-none ${card.numberColor}`}
                    >
                      {card.number}
                    </span>

                    <div className="relative z-10 flex flex-col h-full">
                      {/* Icon + Label row */}
                      <div className="flex items-center gap-3.5 mb-5">
                        <div
                          className={`w-12 h-12 rounded-full ${card.iconBg} text-white flex items-center justify-center shadow-md ${card.iconShadow} shrink-0`}
                        >
                          <IconComponent size={22} strokeWidth={2.2} />
                        </div>
                        <span
                          className={`text-xs font-bold tracking-[0.15em] uppercase ${card.badgeColor}`}
                        >
                          {card.label}
                        </span>
                      </div>

                      {/* Content */}
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-[var(--text)] mb-2.5 tracking-tight leading-snug">
                        {card.title}
                      </h3>
                      <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
                        {card.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── 4. PLATFORM PURPOSE STRIP (2-column on mobile, 4-column on desktop) ── */}
            <div
              className="rounded-[var(--r-2xl)] border border-[var(--border)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm"
              style={{
                padding: 'clamp(1rem, 3vw, 1.5rem)',
                boxSizing: 'border-box',
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 sm:divide-x divide-[var(--border)]">
                {purposeSteps.map((step, idx) => {
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className={`flex flex-col items-center sm:items-start text-center sm:text-left rounded-xl sm:rounded-none bg-[var(--bg-card)]/40 sm:bg-transparent border sm:border-0 border-[var(--border)]/60 ${
                        idx > 0 ? 'sm:pl-6' : ''
                      }`}
                      style={{
                        padding: 'clamp(0.875rem, 2.5vw, 1.25rem)',
                        boxSizing: 'border-box',
                      }}
                    >
                      <StepIcon
                        size={22}
                        className="text-[var(--accent)] mb-2 shrink-0"
                        strokeWidth={2}
                      />
                      <span className="text-xs sm:text-sm font-bold text-[var(--text)] leading-tight">
                        {step.title}
                      </span>
                      <span className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-1 leading-tight">
                        {step.subtitle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}

