'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ChevronRight, Heart, Navigation } from 'lucide-react';
import type { Event } from '@/types';
import Card from '@/components/ui/Card';
import EventDateBadge from '@/components/events/EventDateBadge';
import LazyImage from '@/components/ui/LazyImage';
import toast from 'react-hot-toast';

interface Props {
  event: Event;
  index?: number;
  /** Distance in km from the user (optional — only shown when provided) */
  distanceKm?: number | null;
}

export default function EventbriteCard({ event, index = 0, distanceKm }: Props) {
  const price = event.price === 0 ? 'Free' : event.priceLabel || `$${event.price}`;
  const [liked, setLiked] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    setLiked(v => {
      const newLiked = !v;
      if (newLiked) {
        toast.success('Added to saved events', { 
          icon: '❤️',
          id: `save-${event.id}`,
        });
      } else {
        toast('Removed from saved events', { 
          icon: '🗑️',
          id: `remove-${event.id}`,
        });
      }
      return newLiked;
    });
  };

  const distanceLabel = distanceKm != null
    ? distanceKm < 1
      ? `${Math.round(distanceKm * 1000)}m away`
      : distanceKm < 10
        ? `${distanceKm.toFixed(1)} km`
        : `${Math.round(distanceKm)} km`
    : null;

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
        {/* ── IMAGE SECTION ── */}
        <div className="relative rounded-t-2xl overflow-hidden">
          <motion.div
            className="h-[170px] sm:h-[200px]"
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <LazyImage
              src={event.image}
              alt={event.title}
              wrapperClassName="h-full w-full"
              objectFit="cover"
              fallback="🎉"
            />
          </motion.div>

          {/* ── TOP ROW: date badge + category — single flex row, never overlap ── */}
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2 pointer-events-none z-10">
            <div className="pointer-events-auto shrink-0">
              <EventDateBadge date={event.date} size="sm" />
            </div>
            <div className="pointer-events-auto glass rounded-full px-3.5 py-2 border border-white/10 min-w-0 overflow-hidden">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/90 truncate">
                {event.categoryLabel}
              </p>
            </div>
          </div>

          {/* Like Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleLike}
            className={`absolute bottom-3 right-3 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 ${
              liked 
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            aria-label={liked ? 'Unlike event' : 'Like event'}
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          </motion.button>
        </div>

        {/* ── CONTENT ── */}
        <div className="px-4 pt-3.5 pb-4 sm:px-5 sm:pt-4 sm:pb-5">
          <h3
            className="text-[15px] sm:text-base font-black text-[var(--text)] tracking-[-0.02em] leading-snug line-clamp-2"
            style={{ fontWeight: 900 }}
          >
            {event.title}
          </h3>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-[var(--text-muted)] min-w-0">
              <Calendar size={12} className="shrink-0" />
              <span className="line-clamp-1">{event.date} · {event.time}</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-[var(--text-muted)] min-w-0">
              <MapPin size={12} className="shrink-0" />
              <span className="line-clamp-1">{event.venue}</span>
            </div>
            {/* Distance chip — only rendered when user location is available */}
            {distanceLabel && (
              <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-[var(--accent)]">
                <Navigation size={11} className="shrink-0" />
                <span>{distanceLabel}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3.5 border-t border-[var(--border)] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>Starting from</p>
              <p className="text-base sm:text-lg font-black" style={{ color: 'var(--text)' }}>{price}</p>
            </div>
            <div className="btn btn-sm sm:btn-md btn-primary whitespace-nowrap">
              Get Tickets <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
