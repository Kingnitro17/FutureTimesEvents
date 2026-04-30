'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import type { Event } from '@/types';
import Card from '@/components/ui/Card';
import EventDateBadge from '@/components/events/EventDateBadge';

export default function EventbriteCard({ event, index = 0 }: { event: Event; index?: number }) {
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

          {/* Hero-style glass date badge */}
          <div className="absolute left-4 top-4">
            <EventDateBadge date={event.date} size="sm" />
          </div>

          {/* Category pill */}
          <div className="absolute right-4 top-4">
            <div className="glass rounded-full px-3 py-1.5 border border-white/10">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/85">{event.categoryLabel}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-base sm:text-lg font-black text-[var(--text)] tracking-[-0.02em] leading-snug line-clamp-2">
            {event.title}
          </h3>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] min-w-0">
              <Calendar size={14} className="shrink-0" />
              <span className="line-clamp-1">{event.date} · {event.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] min-w-0">
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

