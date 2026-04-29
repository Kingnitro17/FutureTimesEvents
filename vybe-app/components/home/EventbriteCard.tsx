'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import type { Event } from '@/types';
import Card from '@/components/ui/Card';

function dateParts(date: string) {
  // Expected like "Sat, May 9" → ("MAY", "09") fallback.
  const m = date.match(/,\s*([A-Za-z]{3})\s+(\d{1,2})/);
  if (!m) return { mon: 'DATE', day: '--' };
  return { mon: m[1].toUpperCase(), day: m[2].padStart(2, '0') };
}

export default function EventbriteCard({ event, index = 0 }: { event: Event; index?: number }) {
  const { mon, day } = dateParts(event.date);
  const price = event.price === 0 ? 'Free' : event.priceLabel || `$${event.price}`;

  return (
    <Card
      hover
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <Link href={`/events/${event.id}`} className="block">
        <div className="relative">
          <div className="h-[180px] sm:h-[200px]">
            <motion.div
              className="h-full w-full"
              style={{
                backgroundImage: `url(${event.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>

          {/* Date badge (Eventbrite-style) */}
          <div className="absolute left-4 top-4">
            <div className="glass-strong rounded-2xl overflow-hidden border border-white/10">
              <div className="px-3 py-1.5 text-[10px] font-black tracking-[0.14em] text-white/90 text-center"
                style={{ background: 'rgba(0,0,0,0.35)' }}
              >
                {mon}
              </div>
              <div className="px-3 py-2 text-center bg-white/10">
                <div className="text-[18px] leading-none font-black text-white" style={{ textShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                  {day}
                </div>
              </div>
            </div>
          </div>

          {/* Category pill */}
          <div className="absolute right-4 top-4">
            <div className="glass rounded-full px-3 py-1.5 border border-white/10">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/85">{event.categoryLabel}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-base font-bold text-[var(--text)] tracking-[-0.02em] leading-snug line-clamp-2">
            {event.title}
          </h3>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Calendar size={14} className="shrink-0" />
              <span className="line-clamp-1">{event.date} · {event.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <MapPin size={14} className="shrink-0" />
              <span className="line-clamp-1">{event.venue}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="type-caption text-[var(--text-muted)]">Starting from</p>
              <p className="text-lg font-black text-[var(--text)]">{price}</p>
            </div>
            <div className="btn btn-md btn-primary">
              Details <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}

