'use client';

import { useState, Suspense, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, X, MapPin, Filter, Navigation, Calendar,
} from 'lucide-react';
import EventbriteCard from '@/components/home/EventbriteCard';
import EventFilters from '@/components/events/EventFilters';
import dynamic from 'next/dynamic';
import {
  useEventsFiltered, DEFAULT_FILTERS,
  type EventFilters as Filters, type DateFilter, type SortOption,
} from '@/lib/useEventsFiltered';

const EventsMap = dynamic(() => import('@/components/events/EventsMap'), { ssr: false });

const DATE_FILTERS: DateFilter[] = ['all', 'today', 'this_week', 'this_month', 'upcoming'];
const SORT_OPTIONS: SortOption[] = ['Date', 'Nearest', 'Price: Low', 'Price: High', 'Popularity'];

// Simplified reverse-geocode for Zimbabwe
function detectCity(lat: number, lng: number): string {
  if (lat >= -17.9 && lat <= -17.7 && lng >= 30.9 && lng <= 31.2) return 'Harare';
  if (lat >= -20.3 && lat <= -20.1 && lng >= 28.4 && lng <= 28.7) return 'Bulawayo';
  if (lat >= -19.0 && lat <= -18.8 && lng >= 32.5 && lng <= 32.8) return 'Mutare';
  if (lat >= -19.5 && lat <= -19.3 && lng >= 29.7 && lng <= 30.0) return 'Gweru';
  if (lat >= -20.1 && lat <= -19.9 && lng >= 30.7 && lng <= 31.0) return 'Masvingo';
  if (lat >= -18.4 && lat <= -18.2 && lng >= 29.0 && lng <= 29.3) return 'Kadoma';
  if (lat >= -17.4 && lat <= -17.2 && lng >= 31.2 && lng <= 31.5) return 'Bindura';
  if (lat >= -18.2 && lat <= -18.0 && lng >= 31.4 && lng <= 31.7) return 'Marondera';
  if (lat >= -17.4 && lat <= -17.2 && lng >= 30.0 && lng <= 30.3) return 'Chinhoyi';
  return 'Your Area';
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

// ── Skeleton grid for loading state ──────────────────────────────────────────
function EventGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array(6).fill(null).map((_, i) => (
        <div key={i} className="card rounded-2xl overflow-hidden" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="skeleton h-[170px] sm:h-[200px] w-full" />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="skeleton h-4 w-3/4 rounded-md" />
            <div className="skeleton h-3 w-1/2 rounded-md" />
            <div className="skeleton h-3 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EventsContent() {
  const searchParams  = useSearchParams();
  const router        = useRouter();

  // Initialise filters from URL params
  const dateParam = searchParams?.get('date') as DateFilter | null;
  const sortParam = searchParams?.get('sort') as SortOption | null;
  const priceParam = Number(searchParams?.get('price'));
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    category:   searchParams?.get('cat')    || DEFAULT_FILTERS.category,
    search:     searchParams?.get('q')      || DEFAULT_FILTERS.search,
    city:       searchParams?.get('city')   || DEFAULT_FILTERS.city,
    dateFilter: dateParam && DATE_FILTERS.includes(dateParam) ? dateParam : DEFAULT_FILTERS.dateFilter,
    sort:       sortParam && SORT_OPTIONS.includes(sortParam) ? sortParam : DEFAULT_FILTERS.sort,
    priceMax:   Number.isFinite(priceParam) && priceParam >= 0 && priceParam <= 1000 ? priceParam : DEFAULT_FILTERS.priceMax,
  });

  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userCity,     setUserCity]     = useState('Zimbabwe');
  const [isLocating,   setIsLocating]   = useState(false);
  const [showMap,      setShowMap]      = useState(false);

  // Merge partial filter update
  const handleChange = useCallback((next: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...next }));
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Sync search param back to URL (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.category !== 'all') params.set('cat',  filters.category);
      if (filters.search)             params.set('q',    filters.search);
      if (filters.city)               params.set('city', filters.city);
      if (filters.dateFilter !== 'all') params.set('date', filters.dateFilter);
      if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
      if (filters.priceMax < DEFAULT_FILTERS.priceMax) params.set('price', String(filters.priceMax));
      const qs = params.toString();
      router.replace(`/events${qs ? `?${qs}` : ''}`, { scroll: false });
    }, 400);
    return () => clearTimeout(id);
  }, [filters.category, filters.search, filters.city, filters.dateFilter, filters.sort, filters.priceMax, router]);

  // Geolocation
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!('geolocation' in navigator)) return;
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude, longitude } }) => {
          setUserLocation([latitude, longitude]);
          setUserCity(`${detectCity(latitude, longitude)}, Zimbabwe`);
          setIsLocating(false);
        },
        () => { setIsLocating(false); setUserCity('Zimbabwe'); },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Pass userLocation so the hook can compute distances and sort by "Nearest"
  const { events, loading, error, distances } = useEventsFiltered(filters, userLocation);

  const activeFiltersCount = [
    filters.category !== 'all',
    filters.dateFilter !== 'all',
    filters.priceMax < 1000,
    filters.city !== '',
    filters.sort !== 'Nearest',
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen page-offset pb-nav" style={{ background: 'var(--bg-secondary)' }}>

      {/* ── Hero Header ── */}
      <div className="border-b border-[var(--border)] relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg,rgba(114,34,227,0.08) 0%,rgba(255,85,194,0.06) 50%,rgba(44,196,234,0.05) 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-50 animate-stripe pointer-events-none" />
        <div className="container relative z-10" style={{ paddingBlock: 'clamp(var(--sp-5), 6vw, var(--sp-7))' }}>
          <motion.div {...fadeUp(0)}>
            <div className="flex flex-col" style={{ gap: 'var(--sp-2)' }}>
              <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs sm:text-sm font-semibold tracking-wide uppercase">
                ✨ Discover
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-tight">
                Browse Events
              </h1>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <MapPin size={14} className="sm:w-4 sm:h-4" />
                <span className="text-sm sm:text-base lg:text-lg">
                  {isLocating
                    ? 'Detecting location…'
                    : `${events.length} event${events.length !== 1 ? 's' : ''} in ${userCity}`}
                </span>
              </div>
              {/* Location status badge */}
              {userLocation && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                  <Navigation size={12} />
                  <span>Location active — sorted by nearest first</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container flex flex-col" style={{ paddingBlock: 'var(--sp-5) var(--sp-7)', gap: 'var(--sp-4)' }}>

        {/* ── Search Bar ── */}
        <motion.div {...fadeUp(0.08)}>
          <div className="flex items-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-card)] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_4px_rgba(114,34,227,0.12)] transition-all" style={{ gap: 'var(--sp-2)', padding: 'var(--sp-3)' }}>
            <Search size={20} className="text-[var(--accent)] shrink-0 sm:w-[22px] sm:h-[22px]" />
            <input
              id="events-search"
              value={filters.search}
              onChange={e => handleChange({ search: e.target.value })}
              placeholder="Search events, venues, artists…"
              className="flex-1 bg-transparent text-[var(--text)] placeholder-[var(--text-muted)] outline-none text-base sm:text-lg font-medium"
              aria-label="Search events"
            />
            {filters.search && (
              <button
                onClick={() => handleChange({ search: '' })}
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Toolbar: Filter toggle + Map toggle + chips ── */}
        <motion.div {...fadeUp(0.12)} className="flex flex-wrap items-center" style={{ gap: 'var(--sp-2)' }}>
          <button
            id="toggle-filters"
            onClick={() => setFiltersOpen(v => !v)}
            className={`btn btn-sm sm:btn-md flex items-center gap-2 transition-all relative ${
              filtersOpen || activeFiltersCount > 0
                ? 'btn-primary text-white'
                : 'btn-ghost bg-[var(--bg-card)]'
            }`}
            aria-expanded={filtersOpen}
            aria-controls="event-filters-panel"
          >
            <SlidersHorizontal size={14} />
            <span className="text-xs sm:text-sm">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                style={{ background: 'var(--grad-primary)' }}>
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            id="toggle-map"
            onClick={() => setShowMap(v => !v)}
            className={`btn btn-sm sm:btn-md flex items-center gap-2 transition-all ${
              showMap ? 'btn-primary text-white' : 'btn-ghost bg-[var(--bg-card)]'
            }`}
          >
            <MapPin size={14} />
            <span className="text-xs sm:text-sm">{showMap ? 'Hide Map' : 'Map'}</span>
          </button>

          {/* "Date" quick-toggle (switches back to date-based sorting) */}
          {filters.sort !== 'Date' && (
            <button
              onClick={() => handleChange({ sort: 'Date' })}
              className="btn btn-sm flex items-center gap-1.5 btn-ghost bg-[var(--bg-card)] text-xs"
            >
              <Calendar size={12} />
              <span>Date first</span>
            </button>
          )}

          {/* Active filter chips */}
          {filters.category !== 'all' && (
            <button
              onClick={() => handleChange({ category: 'all' })}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-semibold text-white"
              style={{ background: 'var(--grad-primary)' }}
            >
              {filters.category}
              <X size={11} />
            </button>
          )}
          {filters.city && (
            <button
              onClick={() => handleChange({ city: '' })}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-semibold text-white"
              style={{ background: 'var(--grad-ocean)' }}
            >
              {filters.city}
              <X size={11} />
            </button>
          )}
          {filters.sort === 'Date' && (
            <button
              onClick={() => handleChange({ sort: 'Nearest' })}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-semibold text-white"
              style={{ background: 'var(--grad-emerald)' }}
            >
              <Calendar size={11} /> Date Sorted
              <X size={11} />
            </button>
          )}
        </motion.div>

        {/* ── Main layout: Filters + Results ── */}
        <div className="flex flex-col lg:flex-row items-start" style={{ gap: 'var(--sp-5)' }}>

          {/* Sidebar — desktop always visible; mobile as drawer */}
          <div
            id="event-filters-panel"
            className={`w-full lg:w-72 shrink-0 ${filtersOpen || 'hidden lg:block'}`}
          >
            <EventFilters
              filters={filters}
              onChange={handleChange}
              onReset={handleReset}
              isOpen={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              totalCount={events.length}
            />
          </div>

          {/* Results */}
          <div className="flex flex-1 w-full min-w-0 flex-col" style={{ gap: 'var(--sp-4)' }}>

            {/* Map */}
            {showMap && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden"
              >
                <EventsMap
                  events={events.slice(0, 24)}
                  userLocation={userLocation}
                  defaultZoom={userLocation ? 13 : 7}
                />
              </motion.div>
            )}

            {/* Loading skeleton */}
            {loading && <EventGridSkeleton />}

            {/* Error */}
            {!loading && error && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-16 sm:py-20 card rounded-2xl"
              >
                <p className="text-4xl mb-4">⚠️</p>
                <h3 className="type-h3 text-[var(--text)] mb-2">Could not load events</h3>
                <p className="type-sm text-[var(--text-muted)]">{error}</p>
              </motion.div>
            )}

            {/* Empty state */}
            {!loading && !error && events.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-16 sm:py-20 card rounded-2xl"
              >
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="type-h3 text-[var(--text)] mb-2">No events found</h3>
                <p className="type-sm text-[var(--text-muted)] mb-6">
                  Try adjusting your filters or search term.
                </p>
                <button
                  onClick={handleReset}
                  className="btn btn-sm btn-outline"
                >
                  <Filter size={14} /> Clear All Filters
                </button>
              </motion.div>
            )}

            {/* Event grid */}
            {!loading && !error && events.length > 0 && (
              <>
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-sm sm:text-base text-[var(--text-muted)] font-semibold px-1"
                >
                  Showing <span className="text-[var(--text)]">{events.length}</span>{' '}
                  result{events.length !== 1 ? 's' : ''}
                  {filters.city && ` in ${filters.city}`}
                  {filters.sort === 'Nearest' && ' · sorted by distance'}
                </motion.p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {events.map((ev, i) => (
                    <EventbriteCard
                      key={ev.id}
                      event={ev}
                      index={i}
                      distanceKm={distances[ev.id] ?? null}
                    />
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
            <p className="text-sm text-[var(--text-muted)]">Loading events…</p>
          </div>
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  );
}
