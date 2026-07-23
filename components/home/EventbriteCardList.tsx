'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Event } from '@/types';
import { MapPin, Clock, Heart } from 'lucide-react';
import EventDateBadge from '@/components/events/EventDateBadge';
import toast from 'react-hot-toast';

export function EventbriteCardList({ event }: { event: Event }) {
  const priceLabel = event.price === 0 ? 'Free' : `$${event.price.toFixed(2)}`;
  const [liked, setLiked] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(v => {
      const newLiked = !v;
      if (newLiked) {
        toast.success('Added to saved events', { icon: '❤️' });
      } else {
        toast('Removed from saved events', { icon: '🗑️' });
      }
      return newLiked;
    });
  };

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-row items-center gap-4 p-5 sm:p-6 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 relative"
    >
      {/* Thumbnail */}
      <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Hero-style glass date badge */}
      <div className="shrink-0 hidden sm:block">
        <EventDateBadge date={event.date} size="sm" />
      </div>

      {/* Info — takes all remaining space, truncates properly */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <h3
          className="leading-tight mb-2 group-hover:text-blue-500 transition-colors line-clamp-2"
          style={{ fontSize: 'clamp(1rem,1.2vw+0.75rem,1.0625rem)' }}
        >
          {event.title.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
        </h3>
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-sm text-[var(--text-muted)] font-medium truncate">
            <MapPin size={10} className="shrink-0 text-blue-400" />
            <span className="truncate">{event.venue}</span>
          </span>
          {/* Show time only (not date) to avoid duplication with badge */}
          <span className="flex items-center gap-2 text-sm text-[var(--text-muted)] font-medium sm:hidden">
            <Clock size={10} className="shrink-0 text-pink-400" />
            <span>{event.date} · {event.time}</span>
          </span>
          <span className="hidden sm:flex items-center gap-2 text-sm text-[var(--text-muted)] font-medium">
            <Clock size={10} className="shrink-0 text-pink-400" />
            <span>{event.time}</span>
          </span>
        </div>
      </div>

      {/* Price & Like — right-aligned */}
      <div className="flex flex-col items-end justify-center shrink-0 text-right gap-2">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Starting from</span>
          <span className="text-base font-black leading-none" style={{ color: 'var(--text)' }}>{priceLabel}</span>
        </div>
        
        {/* Like Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            liked 
              ? 'bg-red-500 text-white shadow-md' 
              : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/20'
          }`}
          aria-label={liked ? 'Unlike event' : 'Like event'}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
        </motion.button>
      </div>
    </Link>
  );
}
