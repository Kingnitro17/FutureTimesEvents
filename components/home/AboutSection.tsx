'use client';

import { motion, useReducedMotion } from 'framer-motion';

export default function AboutSection() {
  const shouldReduceMotion = useReducedMotion();

  const values = [
    { label: 'Identity', value: 'Zimbabwean at heart' },
    { label: 'Vision', value: 'Events made effortless' },
    { label: 'Values', value: 'People, culture, connection' },
  ];

  return (
    <section
      className="relative section-pad-sm overflow-hidden"
      style={{ background: 'var(--bg)' }}
      aria-labelledby="about-heading"
    >
      <div className="container relative z-10">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mx-auto max-w-7xl overflow-hidden rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]"
        >
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{ background: 'var(--grad-primary)' }}
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full opacity-15 blur-3xl"
            style={{ background: 'var(--grad-ocean)' }}
          />

          <div className="relative grid gap-8 p-[var(--sp-4)] sm:p-[var(--sp-5)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12 lg:p-[var(--sp-6)]">
            <div className="flex flex-col items-center lg:items-start">
              <span
                className="type-overline inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2"
                style={{ color: 'var(--accent)' }}
              >
                About Us
              </span>
              <span
                aria-hidden="true"
                className="mt-6 h-1 w-12 rounded-full"
                style={{ background: 'var(--grad-primary)' }}
              />
              <h2
                id="about-heading"
                className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-[var(--text)] sm:text-4xl lg:text-5xl text-center lg:text-left"
              >
                Our identity, vision and values
              </h2>
            </div>

            <div className="border-t border-[var(--border)] pt-[var(--sp-5)] lg:border-l lg:border-t-0 lg:pl-[var(--sp-6)] lg:pt-0">
              <p className="text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
                Future Times Events connects people with unforgettable entertainment, cultural experiences and community moments across Zimbabwe. We make it easy to discover events, reserve tickets and create lasting memories.
              </p>

              <dl className="mt-[var(--sp-5)] grid gap-[var(--sp-2)] sm:grid-cols-3">
                {values.map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)] p-[var(--sp-3)]"
                  >
                    <dt className="type-overline text-[var(--text-muted)]">{label}</dt>
                    <dd className="mt-2 text-sm font-semibold leading-snug text-[var(--text)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
