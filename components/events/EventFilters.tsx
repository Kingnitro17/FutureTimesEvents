'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, Calendar, DollarSign, MapPin, Tag } from 'lucide-react';
import type { EventFilters, DateFilter, SortOption } from '@/lib/useEventsFiltered';

const CATEGORIES = [
  { id: 'all',       label: 'All',      icon: '✦', grad: 'from-violet-500 to-purple-600' },
  { id: 'music',     label: 'Music',    icon: '🎵', grad: 'from-pink-500 to-rose-500' },
  { id: 'nightlife', label: 'Nightlife',icon: '✨', grad: 'from-violet-500 to-indigo-600' },
  { id: 'arts',      label: 'Arts',     icon: '🎨', grad: 'from-amber-400 to-orange-500' },
  { id: 'food',      label: 'Food',     icon: '🍽️', grad: 'from-emerald-400 to-green-500' },
  { id: 'tech',      label: 'Tech',     icon: '💻', grad: 'from-cyan-500 to-blue-500' },
  { id: 'sports',    label: 'Sports',   icon: '⚽', grad: 'from-blue-500 to-indigo-500' },
  { id: 'wellness',  label: 'Wellness', icon: '🧘', grad: 'from-violet-400 to-purple-500' },
  { id: 'business',  label: 'Business', icon: '💼', grad: 'from-sky-500 to-blue-600' },
  { id: 'holidays',  label: 'Holidays', icon: '✈️', grad: 'from-teal-400 to-cyan-500' },
  { id: 'dating',    label: 'Dating',   icon: '❤️', grad: 'from-red-400 to-rose-500' },
] as const;

const DATE_OPTIONS: { id: DateFilter; label: string }[] = [
  { id: 'all',        label: '✦ Any time' },
  { id: 'today',      label: 'Today' },
  { id: 'this_week',  label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'upcoming',   label: 'All upcoming' },
];

const SORT_OPTIONS: SortOption[] = ['Date', 'Nearest', 'Price: Low', 'Price: High', 'Popularity'];

const ZIMBABWE_CITIES = [
  '', 'Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Masvingo',
  'Kadoma', 'Marondera', 'Chinhoyi', 'Bindura',
];

interface Props {
  filters:    EventFilters;
  onChange:   (next: Partial<EventFilters>) => void;
  onReset:    () => void;
  isOpen:     boolean;
  onClose:    () => void;
  totalCount: number;
}

function hasActiveFilters(f: EventFilters) {
  return (
    f.category   !== 'all' ||
    f.dateFilter !== 'all' ||
    f.priceMax   <  1000  ||
    f.search     !== ''   ||
    f.city       !== ''
  );
}

export default function EventFilters({
  filters, onChange, onReset, isOpen, onClose, totalCount,
}: Props) {
  const active = hasActiveFilters(filters);

  return (
    <>
      {/* ── Mobile Drawer Overlay ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* ── Drawer / Sidebar ── */}
      <motion.aside
            key="sidebar"
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="
              fixed left-0 top-0 bottom-0 z-50 w-[min(88vw,360px)]
              flex flex-col overflow-y-auto scrollbar-hide
              lg:static lg:z-auto lg:w-full lg:translate-x-0 lg:flex-none
              card border-r border-[var(--border)] rounded-none lg:rounded-2xl
              lg:sticky lg:top-[calc(var(--nav-h)+16px)] lg:max-h-[calc(100vh-var(--nav-h)-40px)]
            "
            style={{ background: 'var(--bg-card)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] shrink-0" style={{ padding: 'var(--sp-3)' }}>
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-[var(--accent)]" />
                <span className="font-bold text-[var(--text)]">Filters</span>
                {active && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: 'var(--grad-primary)' }}>
                    ON
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {active && (
                  <button
                    onClick={onReset}
                    className="text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                  aria-label="Close filters"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto scrollbar-hide" style={{ padding: 'var(--sp-3)', gap: 'var(--sp-5)' }}>

              {/* ── Category ── */}
              <section aria-label="Category filter">
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={13} className="text-[var(--text-muted)]" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Category</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(c => (
                    <motion.button
                      key={c.id}
                      onClick={() => onChange({ category: c.id })}
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-[10px] font-semibold transition-all duration-200 ${
                        filters.category === c.id
                          ? `bg-gradient-to-br ${c.grad} text-white shadow-lg`
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text)]'
                      }`}
                    >
                      <span className="text-base leading-none">{c.icon}</span>
                      <span className="leading-tight text-center">{c.label}</span>
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* ── City ── */}
              <section aria-label="City filter">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={13} className="text-[var(--text-muted)]" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">City</h3>
                </div>
                <select
                  value={filters.city}
                  onChange={e => onChange({ city: e.target.value })}
                  className="input text-sm"
                  aria-label="Filter by city"
                >
                  <option value="">All cities</option>
                  {ZIMBABWE_CITIES.slice(1).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </section>

              {/* ── Date ── */}
              <section aria-label="Date filter">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={13} className="text-[var(--text-muted)]" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Date</h3>
                </div>
                <div className="flex flex-col gap-1.5">
                  {DATE_OPTIONS.map(d => (
                    <motion.button
                      key={d.id}
                      onClick={() => onChange({ dateFilter: d.id })}
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all duration-200 ${
                        filters.dateFilter === d.id
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]/20'
                          : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                        filters.dateFilter === d.id ? 'bg-[var(--accent)] scale-125' : 'bg-[var(--border)]'
                      }`} />
                      {d.label}
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* ── Price ── */}
              <section aria-label="Price filter">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign size={13} className="text-[var(--text-muted)]" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Max Price</h3>
                  </div>
                  <span className="text-sm font-bold text-[var(--accent)]">
                    {filters.priceMax >= 1000 ? 'Any' : `$${filters.priceMax}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={10}
                  value={filters.priceMax}
                  onChange={e => onChange({ priceMax: Number(e.target.value) })}
                  className="w-full accent-[var(--accent)] h-2 rounded-full cursor-pointer"
                  aria-label="Maximum price"
                />
                <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-2 font-medium">
                  <span>Free</span>
                  <span>$500</span>
                  <span>$1000+</span>
                </div>
              </section>

              {/* ── Sort ── */}
              <section aria-label="Sort options">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Sort By</h3>
                <div className="grid grid-cols-2 gap-2">
                  {SORT_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => onChange({ sort: s })}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all duration-200 ${
                        filters.sort === s
                          ? 'text-white shadow-md'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                      style={filters.sort === s ? { background: 'var(--grad-primary)' } : {}}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>

            </div>

            {/* Footer — results count */}
            <div className="shrink-0 border-t border-[var(--border)]" style={{ padding: 'var(--sp-3)' }}>
              <button
                onClick={onClose}
                className="btn btn-lg btn-grad w-full text-white lg:hidden"
              >
                Show {totalCount} result{totalCount !== 1 ? 's' : ''}
              </button>
              <p className="hidden lg:block text-xs text-center text-[var(--text-muted)] font-medium">
                {totalCount} result{totalCount !== 1 ? 's' : ''} found
              </p>
            </div>
      </motion.aside>
    </>
  );
}
