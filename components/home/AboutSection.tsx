'use client';

import { motion, useReducedMotion } from 'framer-motion';

export default function AboutSection() {
  const shouldReduceMotion = useReducedMotion();

  const values = [
    {
      label: 'Identity',
      value: 'Built to connect Zimbabwe through unforgettable experiences.',
      icon: '🌍',
    },
    {
      label: 'Vision',
      value: 'Make every event effortless to discover, book and enjoy.',
      icon: '🔭',
    },
    {
      label: 'Values',
      value: 'People first. Local culture. Trusted experiences. Real connection.',
      icon: '✨',
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
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Decorative blobs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full opacity-15 blur-3xl"
            style={{ background: 'var(--grad-primary)' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full opacity-10 blur-3xl"
            style={{ background: 'var(--grad-ocean)' }}
          />

          <div className="relative p-6 sm:p-8 lg:p-10">
            {/* Header */}
            <div className="flex flex-col items-start mb-6 sm:mb-8">
              <span
                className="type-overline inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 mb-4"
                style={{ color: 'var(--accent)' }}
              >
                About Us
              </span>
              <span
                aria-hidden="true"
                className="h-0.5 w-10 rounded-full mb-4"
                style={{ background: 'var(--grad-primary)' }}
              />
              <h2
                id="about-heading"
                className="font-display font-bold leading-tight tracking-tight text-[var(--text)] mb-4"
                style={{ fontSize: 'clamp(1.35rem, 2.5vw + 0.8rem, 2rem)' }}
              >
                Our identity, vision&nbsp;&amp;&nbsp;values
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] max-w-2xl">
                Future Times Events connects people with unforgettable entertainment, cultural experiences
                and community moments across Zimbabwe. We make it easy to discover events, reserve
                tickets and create lasting memories.
              </p>
            </div>

            {/* Divider */}
            <div className="divider mb-6 sm:mb-8" />

            {/* Value cards */}
            <dl className="grid gap-4 sm:grid-cols-3">
              {values.map(({ label, value, icon }) => (
                <div
                  key={label}
                  className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
                  style={{ boxSizing: 'border-box' }}
                >
                  <div className="text-2xl mb-3" aria-hidden="true">{icon}</div>
                  <dt
                    className="type-overline text-[var(--accent)] mb-2"
                  >
                    {label}
                  </dt>
                  <dd className="text-sm font-medium leading-relaxed text-[var(--text)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
