'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Calendar, MapPin, Heart, Share2, Star, ChevronRight, Users } from 'lucide-react';
import { Event } from '@/types';
import Card from '@/components/ui/Card';
import EventDateBadge from '@/components/events/EventDateBadge';

function RadialCapacity({ pct, color }: { pct: number; color: string }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const dash = (p / 100) * c;
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9">
        <svg width="36" height="36" viewBox="0 0 36 36" className="block">
          <circle cx="18" cy="18" r={r} stroke="rgba(0,0,0,0.08)" strokeWidth="3.5" fill="none" />
          <motion.circle
            cx="18"
            cy="18"
            r={r}
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={`${dash} ${c - dash}`}
            transform="rotate(-90 18 18)"
            initial={{ strokeDasharray: `0 ${c}` }}
            whileInView={{ strokeDasharray: `${dash} ${c - dash}` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Users size={12} className="text-[var(--text-muted)]" />
        </div>
      </div>
      <div className="leading-tight">
        <p className="type-caption text-[var(--text-muted)]">Capacity</p>
        <p className="text-xs font-bold text-[var(--text)]">{p}%</p>
      </div>
    </div>
  );
}

interface EventCardProps {
  event: Event;
  index?: number;
  variant?: 'default' | 'compact' | 'featured';
}

export default function EventCard({ event, index = 0, variant = 'default' }: EventCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [liked, setLiked] = useState(false);

  const pct = Math.round((event.attendees / event.capacity) * 100);
  const isAlmost = pct >= 80;
  const isSoldOut = pct >= 100;
  const isFree = event.price === 0;

  const GRAD_MAP: Record<string, string> = {
    music:    'linear-gradient(135deg,#FF55C2,#7222E3)',
    tech:     'linear-gradient(135deg,#1D5BFF,#C7FE17)',
    art:      'linear-gradient(135deg,#DD1FFF,#24D8FB)',
    food:     'linear-gradient(135deg,#FFBC73,#FF00B9)',
    wellness: 'linear-gradient(135deg,#46FFAB,#A02EFF)',
    sports:   'linear-gradient(135deg,#2CC4EA,#533885)',
  };
  const catGrad = GRAD_MAP[event.category] || 'linear-gradient(135deg,#FF55C2,#7222E3)';

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.42, delay: index * 0.06, ease: 'easeOut' }}
        whileHover={{ y: -3 }}
      >
        <Link
          href={`/events/${event.id}`}
          className="flex gap-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] hover:shadow-[var(--shadow)] transition-all group"
        >
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
            {!imgLoaded && <div className="absolute inset-0 skeleton" />}
            <img src={event.image} alt={event.title}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
          <div className="flex-1 min-w-0 py-1">
            <p className="text-base font-black text-[var(--text)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors leading-snug">
              {event.title}
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-2 line-clamp-1 flex items-center gap-2 min-w-0">
              <Calendar size={12} className="shrink-0" />
              <span className="truncate">{event.date}</span>
            </p>
            <p className="text-sm font-black mt-2 grad-text">{isFree ? 'Free' : event.priceLabel}</p>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <Card
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: 'easeOut' }}
      className="group overflow-hidden"
    >
      {/* ── IMAGE ── */}
      <Link href={`/events/${event.id}`} className="block relative overflow-hidden" style={{ height: '200px' }}>
        {!imgLoaded && <div className="absolute inset-0 skeleton" />}
        <motion.img
          src={event.image}
          alt={event.title}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          whileHover={{ scale: 1.06 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Hero-style date badge */}
        <div className="absolute top-4 left-4">
          <EventDateBadge date={event.date} size="sm" />
        </div>

        {/* Top-right badges */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <span
            className="badge text-white text-[10px] px-4 py-1 rounded-full font-bold"
            style={{ background: catGrad }}
          >
            {event.categoryLabel}
          </span>
          {event.featured && (
            <span className="badge badge-grad text-[10px] px-4 py-1 rounded-full flex items-center gap-2">
              <Star size={8} fill="currentColor" />
              FEATURED
            </span>
          )}
        </div>

        {/* Price — bottom left: label stacked above price, matching hero */}
        <div className="absolute bottom-4 left-4 flex flex-col items-start gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
            {isFree ? '' : 'Starting from'}
          </span>
          <span className="text-base font-black" style={{ color: '#ffffff', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
            {isFree ? 'Free' : event.priceLabel}
          </span>
        </div>

        {/* Like */}
        <motion.button
          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.88 }}
          onClick={e => { e.preventDefault(); setLiked(v => !v); }}
          className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} className={liked ? 'text-red-400' : ''} />
        </motion.button>
      </Link>

      {/* ── BODY ── */}
      <Link href={`/events/${event.id}`} className="block">
        <div className="p-6">
          <h3
            className="leading-snug mb-3 line-clamp-2 group-hover:text-[var(--accent)] transition-colors duration-200"
            style={{ fontSize: 'clamp(1rem,1.5vw+0.75rem,1.125rem)', letterSpacing: '-0.01em' }}
          >
            {event.title}
          </h3>

          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar size={12} className="shrink-0 text-[var(--text-muted)]" />
              <span className="caption text-[var(--text-muted)] truncate">{event.date} · {event.time}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={12} className="shrink-0 text-[var(--text-muted)]" />
              <span className="caption text-[var(--text-muted)] truncate">{event.venue}</span>
            </div>
          </div>

          <div className="pt-1">
            <RadialCapacity
              pct={isSoldOut ? 100 : pct}
              color={isSoldOut ? '#ef4444' : isAlmost ? '#f97316' : 'rgba(var(--accent-rgb),0.95)'}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-2">
              {event.attendees.toLocaleString()} attending · {Math.max(0, event.capacity - event.attendees).toLocaleString()} spots left
            </p>
          </div>
        </div>
      </Link>

      {/* ── FOOTER ── */}
      <div className="px-6 pb-6 flex items-center justify-between">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Link href={`/events/${event.id}`}
            className="min-h-12 flex items-center gap-2 text-xs font-bold text-white px-6 py-2 rounded-xl"
            style={{ background: catGrad }}>
            {isFree ? 'Register' : 'Get Tickets'} <ChevronRight size={12} />
          </Link>
        </motion.div>
        <button
          onClick={e => { e.preventDefault(); navigator.clipboard?.writeText(window.location.origin + '/events/' + event.id); }}
          className="w-7 h-7 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text)] transition-all"
        >
          <Share2 size={11} />
        </button>
      </div>
    </Card>
  );
}
