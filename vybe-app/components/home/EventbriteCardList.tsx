'use client';

import Link from 'next/link';
import { Event } from '@/types';
import { MapPin, Clock } from 'lucide-react';

export function EventbriteCardList({ event }: { event: Event }) {
  const priceLabel = event.price === 0 ? 'Free' : `$${event.price.toFixed(2)}`;

  let month = 'MAY';
  let day = '01';
  if (event.date) {
    const parts = event.date.split(',');
    if (parts.length > 1) {
      const monthDay = parts[1].trim().split(' ');
      if (monthDay.length >= 2) {
        month = monthDay[0].substring(0, 3).toUpperCase();
        day = monthDay[1].padStart(2, '0');
      }
    }
  }

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-row items-center gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Date badge */}
      <div className="flex flex-col items-center justify-center text-center w-9 shrink-0">
        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest leading-none">{month}</span>
        <span className="text-2xl font-black text-[var(--text)] leading-tight">{day}</span>
      </div>

      {/* Info — takes all remaining space, truncates properly */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <h3 className="text-sm font-bold text-[var(--text)] leading-tight mb-2 group-hover:text-blue-500 transition-colors line-clamp-2 capitalize">
          {event.title.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
        </h3>
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-medium truncate">
            <MapPin size={10} className="shrink-0 text-blue-400" />
            <span className="truncate">{event.venue}</span>
          </span>
          <span className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-medium">
            <Clock size={10} className="shrink-0 text-pink-400" />
            <span>{event.time || event.date}</span>
          </span>
        </div>
      </div>

      {/* Price — right-aligned, fixed width, never breaks layout */}
      <div className="flex flex-col items-end justify-center shrink-0 text-right gap-1">
        <span className="text-base font-black text-[var(--text)] leading-none">{priceLabel}</span>
        <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">from</span>
      </div>
    </Link>
  );
}
