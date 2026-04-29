'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import EventCard from '@/components/events/EventCard';
import EventsMap from '@/components/events/EventsMap';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { MOCK_EVENTS } from '@/lib/mockData';

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

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [cat,         setCat]         = useState(() => searchParams.get('cat') || 'all');
  const [sort,        setSort]        = useState('Date');
  const [search,      setSearch]      = useState(() => searchParams.get('q') || '');
  const [priceMax,    setPriceMax]    = useState(500);
  const [showFilters, setShowFilters] = useState(false);

  // Sync URL params if they change (e.g. back-navigation)
  useEffect(() => {
    const q   = searchParams.get('q')   || '';
    const cat = searchParams.get('cat') || 'all';
    setSearch(q);
    setCat(cat);
  }, [searchParams]);

  let events = MOCK_EVENTS.filter(e => {
    if (cat !== 'all' && e.category !== cat) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.venue.toLowerCase().includes(search.toLowerCase())) return false;
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
        <div className="container relative z-10 py-6 sm:py-12 text-left">
          <motion.div {...fadeUp(0)}>
            <p className="section-label mb-2">Discover</p>
            <h1 className="text-2xl sm:text-5xl font-black text-[var(--text)] mb-2 tracking-tight">Browse Events</h1>
            <p className="text-sm text-[var(--text-muted)] max-w-xl">
              {MOCK_EVENTS.length} upcoming events across Zimbabwe.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container py-6 sm:py-10">

        {/* Search + Controls */}
        <motion.div {...fadeUp(0.1)} className="flex flex-col gap-3 mb-6">
          
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_rgba(114,34,227,0.1)] transition-all">
            <Search size={18} className="text-[var(--text-muted)] shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search events, venues, artists…"
              className="flex-1 bg-transparent text-[var(--text)] placeholder-[var(--text-muted)] outline-none text-base" />
            {search && (
              <button onClick={() => setSearch('')} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowFilters(v => !v)}
              className={`btn btn-md flex-1 sm:flex-none transition-colors ${showFilters ? 'btn-primary border-[var(--border-hover)]' : 'btn-ghost bg-[var(--bg-card)]'}`}>
              <SlidersHorizontal size={16} /> Filters
            </button>
            
            <div className="relative group flex-1 sm:flex-none">
              <button className="btn btn-md btn-ghost bg-[var(--bg-card)] w-full justify-between">
                {sort} <ChevronDown size={14} className="opacity-50" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[var(--border)] glass-strong shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                {SORTS.map(s => (
                  <button key={s} onClick={() => setSort(s)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-[var(--bg-secondary)] transition-colors ${sort === s ? 'font-bold text-[var(--accent)] bg-[var(--bg-secondary)]' : 'text-[var(--text)]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Filters sidebar — CSS-driven visibility, no hydration bug */}
          <div className={`w-full lg:w-64 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                <div className="card rounded-2xl p-6 sticky top-[calc(var(--nav-h)+24px)]">
                  
                  {/* Category */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-[var(--text)] mb-4">Category</h3>
                    <div className="flex flex-col gap-1.5">
                      {CATEGORIES.map(c => (
                        <button key={c.id} onClick={() => setCat(c.id)}
                          className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                      <h3 className="text-sm font-bold text-[var(--text)]">Max Price</h3>
                      <span className="text-xs font-bold text-[var(--accent)]">${priceMax}</span>
                    </div>
                    <input type="range" min="0" max="1000" step="10" value={priceMax} onChange={e => setPriceMax(Number(e.target.value))}
                      className="w-full accent-[var(--accent)]" />
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
                      <span>$0</span><span>$1000+</span>
                    </div>
                  </div>

                  {/* Date (Mock) */}
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text)] mb-4">Date</h3>
                    <div className="space-y-2">
                      {['Anytime', 'Today', 'This Weekend', 'Next Week'].map((d, i) => (
                        <label key={d} className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${i === 0 ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] group-hover:border-[var(--text-muted)]'}`}>
                            {i === 0 && <div className="w-2 h-2 bg-white rounded-sm" />}
                          </div>
                          <span className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">{d}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
          </div>

          {/* Results */}
          <div className="flex-1 w-full min-w-0 space-y-4">
            {/* Map hidden on mobile (too tall, use events list instead) */}
            <div id="events-map" className="hidden sm:block">
              <EventsMap events={events.slice(0, 24)} />
            </div>

            {events.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 card rounded-2xl">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="type-h3 text-[var(--text)] mb-2">No events found</h3>
                <p className="type-sm text-[var(--text-muted)] mb-6">Try adjusting your filters or search term.</p>
                <button onClick={() => { setCat('all'); setSearch(''); setPriceMax(500); }} className="btn btn-sm btn-outline">Clear Filters</button>
              </motion.div>
            ) : (
              <>
                <p className="text-sm text-[var(--text-muted)] mb-4 font-medium">Showing {events.length} results</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-6">
                  {events.map((ev, i) => (
                    <EventCard key={ev.id} event={ev} index={i} />
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
