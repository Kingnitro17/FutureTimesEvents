'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronDown, MapPin } from 'lucide-react';
import type { Event } from '@/types';
import EventbriteCard from '@/components/home/EventbriteCard';
import { uniqueEvents } from '@/lib/useEvents';

type TabId = 'all' | 'forYou' | 'today' | 'weekend';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'forYou', label: 'For you' },
  { id: 'today', label: 'Today' },
  { id: 'weekend', label: 'This weekend' },
];

function localISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function upcomingWeekend(now: Date): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntilSaturday = (6 - start.getDay() + 7) % 7;
  // On Sunday, "this weekend" means the next full Saturday/Sunday pair.
  start.setDate(start.getDate() + (daysUntilSaturday === 0 && start.getDay() === 0 ? 6 : daysUntilSaturday));
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start: localISODate(start), end: localISODate(end) };
}

export default function EventsInCitySection({
  events,
  city = 'Zimbabwe',
  country = 'Zimbabwe',
}: {
  events: Event[];
  city?: string;
  country?: string;
}) {
  const [tab, setTab] = useState<TabId>('all');

  const shown = useMemo(() => {
    const unique = uniqueEvents(events);
    const today = localISODate(new Date());
    const weekend = upcomingWeekend(new Date());
    switch (tab) {
      case 'forYou':
        return [...unique]
          .sort((a, b) => Number(b.featured) - Number(a.featured) || b.attendees - a.attendees)
          .slice(0, 8);
      case 'today':
        return unique.filter(event => event.dateISO === today);
      case 'weekend':
        return unique.filter(event => event.dateISO >= weekend.start && event.dateISO <= weekend.end);
      case 'all':
      default:
        return unique.slice(0, 12);
    }
  }, [events, tab]);

  return (
    <section
      className="relative z-10 section-pad"
      style={{ background: 'var(--bg)', paddingTop: 'var(--sp-4)' }}
    >
      <div className="container">
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 text-center sm:text-left">
              <div className="section-title">
                <span className="overline">Browsing events in</span>
                <Link
                  href={`/events?city=${encodeURIComponent(city)}`}
                  className="mt-0 inline-flex items-center justify-center sm:justify-start gap-2 max-w-full"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <MapPin size={18} className="shrink-0 text-[var(--text-muted)]" />
                    <span className="truncate">{city}</span>
                  </span>
                  <ChevronDown size={18} className="shrink-0 text-[var(--text-muted)]" />
                </Link>
                <p className="caption text-[var(--text-muted)] mt-1">{country}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center sm:justify-start gap-2">
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-5 py-2.5 rounded-full border text-sm font-bold transition-all duration-300 ${
                    active 
                      ? 'shadow-md' 
                      : 'hover:shadow-sm'
                  }`}
                  style={{
                    borderColor: active ? 'rgba(var(--accent-rgb),0.5)' : 'var(--border)',
                    background: active ? 'rgba(var(--accent-rgb),0.15)' : 'var(--bg-secondary)',
                    color: active ? 'var(--accent)' : 'var(--text)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    {active && (
                      <motion.span
                        layoutId="activeTabIndicator"
                        className="w-1.5 h-1.5 rounded-full bg-current"
                      />
                    )}
                    {t.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 min-w-0">
            {shown.map((ev, idx) => (
              <EventbriteCard key={ev.id} event={ev} index={idx} />
            ))}
          </div>
          {shown.length === 0 && (
            <div className="card rounded-[var(--r-2xl)] text-center" style={{ padding: 'var(--sp-5)' }}>
              <p className="font-bold text-[var(--text)]">No events match this filter yet.</p>
              <p className="text-sm text-[var(--text-muted)]" style={{ marginTop: 'var(--sp-1)' }}>Try All or check back when new events are published.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

