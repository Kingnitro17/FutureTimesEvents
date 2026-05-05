'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown } from 'lucide-react';
import { getEvents } from '@/lib/queries';
import type { Event } from '@/types';
import { EventbriteCardList } from '@/components/home/EventbriteCardList';

const EventsMap = dynamic(() => import('@/components/events/EventsMap'), { ssr: false });

const HARARE_CENTER: [number, number] = [-17.824858, 31.053028];

export default function MapPage() {
  const [page, setPage] = useState(1);
  const [harareEvents, setHarareEvents] = useState<Event[]>([]);

  useEffect(() => {
    getEvents({ city: 'Harare' }).then(setHarareEvents);
  }, []);

  const visible = harareEvents.slice(0, Math.min(20, page * 5));

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--bg-secondary)' }}>
      {/* Map Section */}
      <div className="sticky top-[var(--nav-h)] z-20 w-full bg-[var(--bg-secondary)] pb-2">
        <EventsMap
          events={harareEvents}
          title="Your Location"
          subtitle="Harare, Zimbabwe"
          defaultCenter={HARARE_CENTER}
          defaultZoom={12}
          heightClass="h-[40vh] sm:h-[50vh]"
        />
      </div>

      {/* Events List Section */}
      <div className="container pt-8 pb-12">
        <div className="section-title mb-6">
          <span className="overline">Near you</span>
          <h2>Events in your area</h2>
          <p className="caption text-[var(--text-muted)] mt-1">
            {harareEvents.length} events happening around Harare
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {visible.map((ev) => (
            <EventbriteCardList key={ev.id} event={ev} />
          ))}
        </div>

        {visible.length < harareEvents.length && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-6 py-4 min-h-12 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-[var(--text)] text-sm font-medium"
            >
              Load More Events <ChevronDown size={16} className="inline-block ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
