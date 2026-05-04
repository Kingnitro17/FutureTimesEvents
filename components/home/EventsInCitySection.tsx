'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, MapPin } from 'lucide-react';
import type { Event } from '@/types';
import EventbriteCard from '@/components/home/EventbriteCard';

type TabId = 'all' | 'forYou' | 'today' | 'weekend';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'forYou', label: 'For you' },
  { id: 'today', label: 'Today' },
  { id: 'weekend', label: 'This weekend' },
];

function pick(events: Event[], start: number, count: number) {
  if (!events.length) return [];
  const out: Event[] = [];
  for (let i = 0; i < count; i++) out.push(events[(start + i) % events.length]);
  return out;
}

export default function EventsInCitySection({
  events,
  city = 'Harare',
  country = 'Zimbabwe',
}: {
  events: Event[];
  city?: string;
  country?: string;
}) {
  const [tab, setTab] = useState<TabId>('all');

  const shown = useMemo(() => {
    switch (tab) {
      case 'forYou':
        return pick(events, 1, 8);
      case 'today':
        return pick(events, 0, 6);
      case 'weekend':
        return pick(events, 2, 8);
      case 'all':
      default:
        return events.slice(0, 12);
    }
  }, [events, tab]);

  return (
    <section
      className="relative z-10 section-pad"
      style={{ background: 'var(--bg)' }}
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

          <div className="pill-scroll justify-center sm:justify-start">
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="px-5 py-2.5 rounded-full border text-sm font-bold transition-colors"
                  style={{
                    borderColor: active ? 'rgba(var(--accent-rgb),0.35)' : 'var(--border)',
                    background: active ? 'rgba(var(--accent-rgb),0.10)' : 'var(--bg-secondary)',
                    color: 'var(--text)',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {shown.map((ev, idx) => (
              <EventbriteCard key={`${tab}-${ev.id}-${idx}`} event={ev} index={idx} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

