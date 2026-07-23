'use client';

import { motion } from 'framer-motion';

export default function AboutSection() {
  return (
    <section className="relative py-16 sm:py-20 overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
              About Us
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text)] mb-6 tracking-tight">
              Our Identity, Vision and Values
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
              Future Times Events connects people with unforgettable entertainment, cultural experiences and community moments across Zimbabwe. We make it easy to discover events, reserve tickets and create lasting memories.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
