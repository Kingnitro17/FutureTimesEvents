'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import EventCard from '@/components/events/EventCard';
import dynamic from 'next/dynamic';
const EventsMap = dynamic(() => import('@/components/events/EventsMap'), { ssr: false });
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const CATEGORIES = [
  { id: 'all',      label: '✦ All'      },
  { id: 'music',    label: '🎵 Music'   },
  { id: 'tech',     label: '💻 Tech'    },
  { id: 'art',      label: '🎨 Art'     },
  { id: 'food',     label: '🍽️ Food'    },
  { id: 'sports',   label: '⚽ Sports'  },
  { id: 'wellness', label: '🧘 Wellness'},
];
const SORTS = ['Date', 'Price: Low', 'Price: High', 'Popularity'];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

interface EventRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  category_label: string;
  starts_at: string;
  venue_name: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  cover_image_url: string | null;
  status: string;
  featured: boolean;
  price: number;
  attendees: number;
}

function EventsContent() {
  const searchParams = useSearchParams();
  const [cat,         setCat]         = useState(() => searchParams.get('cat') || 'all');
  const [sort,        setSort]        = useState('Date');
  const [search,      setSearch]      = useState(() => searchParams.get('q') || '');
  const [priceMax,    setPriceMax]    = useState(1000);
  const [showFilters, setShowFilters] = useState(false);
  const [allEvents,   setAllEvents]   = useState<EventRow[]>([]);
  const [loading,     setLoading]     = useState(true);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, slug, category, category_label, starts_at,
          venue_name, address, city, lat, lng,
          cover_image_url, status, featured,
          ticket_types(price, quantity_available)
        `)
        .in('status', ['published', 'sold_out'])
        .order('starts_at', { ascending: true });

      if (!error && data) {
        const mapped = data.map((ev: any) => {
          const tiers = (ev.ticket_types as unknown as { price: number; quantity_available: number }[]) ?? [];
          const minPrice = tiers.length > 0 ? Math.min(...tiers.map((t: any) => t.price)) : 0;
          return { ...ev, price: minPrice, attendees: 0, lat: ev.lat ?? null, lng: ev.lng ?? null } as EventRow;
        });
        setAllEvents(mapped);
      }
      setLoading(false);
    };
    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let events = allEvents.filter(e => {
    if (cat !== 'all' && e.category !== cat) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.venue_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (e.price > priceMax) return false;
    return true;
  });
  if (sort === 'Price: Low')  events = [...events].sort((a, b) => a.price - b.price);
  if (sort === 'Price: High') events = [...events].sort((a, b) => b.price - a.price);
  if (sort === 'Popularity')  events = [...events].sort((a, b) => b.attendees - a.attendees);

  return (
    <div className="min-h-screen page-offset pb-nav" style={{ background: 'var(--bg-secondary)' }}>

      {/* Hero Header */}
      <div className="border-b border-[var(--border)] relative overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="absolute inset-0 opacity-40 dark:opacity-20 animate-stripe pointer-events-none" />
        <div className="container relative z-10 py-10 sm:py-16 text-left">
          <motion.div {...fadeUp(0)}>
            <div className="section-title">
              <span className="overline">Discover</span>
              <h1>Browse Events</h1>
            </div>
            <p className="caption text-[var(--text-muted)] max-w-xl">
              {loading ? 'Loading events…' : `${allEvents.length} upcoming event${allEvents.length !== 1 ? 's' : ''} across Zimbabwe.`}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container py-6 sm:py-10">

        {/* Search + Controls */}
        <motion.div {...fadeUp(0.1)} className="flex flex-col gap-4 mb-6">
          
          <div className="flex items-center gap-4 px-4 py-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_rgba(114,34,227,0.1)] transition-all">
            <Search size={18} className="text-[var(--text-muted)] shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search events, venues, artists…"
              className="flex-1 bg-transparent text-[var(--text)] placeholder-[var(--text-muted)] outline-none text-base"
              aria-label="Search events" />
            {search && (
              <button onClick={() => setSearch('')} className="text-[var(--text-muted)] hover:text-[var(--text)]" aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setShowFilters(v => !v)}
              className={`btn btn-md flex-1 sm:flex-none transition-colors ${showFilters ? 'btn-primary border-[var(--border-hover)]' : 'btn-ghost bg-[var(--bg-card)]'}`}
              aria-expanded={showFilters} aria-controls="events-filters">
              <SlidersHorizontal size={16} /> Filters
            </button>
            
            <div className="relative group flex-1 sm:flex-none">
              <button className="btn btn-md btn-ghost bg-[var(--bg-card)] w-full justify-between" aria-haspopup="listbox">
                {sort} <ChevronDown size={14} className="opacity-50" />
              </button>
              <div role="listbox" className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[var(--border)] glass-strong shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                {SORTS.map(s => (
                  <button key={s} role="option" aria-selected={sort === s} onClick={() => setSort(s)}
                    className={`w-full text-left px-4 py-4 text-sm hover:bg-[var(--bg-secondary)] transition-colors ${sort === s ? 'font-bold text-[var(--accent)] bg-[var(--bg-secondary)]' : 'text-[var(--text)]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Filters sidebar */}
          <div id="events-filters" className={`w-full lg:w-64 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                <div className="card rounded-2xl p-6 sticky top-[calc(var(--nav-h)+24px)]">
                  
                  {/* Category */}
                  <div className="mb-8">
                    <h3 style={{ fontSize: '0.875rem' }} className="mb-4">Category</h3>
                    <div className="flex flex-col gap-2">
                      {CATEGORIES.map(c => (
                        <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={cat === c.id}
                          className={`text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            cat === c.id ? 'bg-[var(--bg-secondary)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text)]'
                          }`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 style={{ fontSize: '0.875rem' }}>Max Price</h3>
                      <span className="text-xs font-bold text-[var(--accent)]">${priceMax}</span>
                    </div>
                    <input type="range" min="0" max="1000" step="10" value={priceMax} onChange={e => setPriceMax(Number(e.target.value))}
                      className="w-full accent-[var(--accent)]" aria-label="Maximum price filter" />
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
                      <span>$0</span><span>$1000+</span>
                    </div>
                  </div>

                </div>
          </div>

          {/* Results */}
          <div className="flex-1 w-full min-w-0 space-y-4">
            <div id="events-map" className="hidden sm:block">
              <EventsMap events={events.slice(0, 24).map(e => ({
                ...e,
                date: e.starts_at,
                venue: e.venue_name,
                attendees: e.attendees,
                capacity: 0,
                image: e.cover_image_url ?? '',
                tags: [],
                isFeatured: e.featured,
                gradient: '',
                organizer: { name: '', avatar: '', role: '' },
                ticketTiers: [],
                tableOptions: [],
                bottleService: [],
              })) as any} />
            </div>

            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-[var(--text-muted)]">Loading events…</p>
              </div>
            ) : events.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 card rounded-2xl">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="type-h3 text-[var(--text)] mb-2">
                  {allEvents.length === 0 ? 'No upcoming events' : 'No events found'}
                </h3>
                <p className="type-sm text-[var(--text-muted)] mb-6">
                  {allEvents.length === 0
                    ? 'Check back soon — events will appear here once published.'
                    : 'Try adjusting your filters or search term.'}
                </p>
                {allEvents.length > 0 && (
                  <button onClick={() => { setCat('all'); setSearch(''); setPriceMax(1000); }} className="btn btn-sm btn-outline">
                    Clear Filters
                  </button>
                )}
              </motion.div>
            ) : (
              <>
                <p className="text-sm text-[var(--text-muted)] mb-4 font-medium">Showing {events.length} result{events.length !== 1 ? 's' : ''}</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-6">
                  {events.map((ev, i) => (
                    <EventCard key={ev.id} event={{
                      ...ev,
                      date: ev.starts_at,
                      venue: ev.venue_name,
                      attendees: ev.attendees,
                      capacity: 0,
                      image: ev.cover_image_url ?? '',
                      tags: [],
                      isFeatured: ev.featured,
                      gradient: '',
                      organizer: { name: '', avatar: '', role: '' },
                      ticketTiers: [],
                      tableOptions: [],
                      bottleService: [],
                    } as any} index={i} href={`/events/${ev.slug}`} />
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading events...</div>}>
      <EventsContent />
    </Suspense>
  );
}
