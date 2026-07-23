'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Download, ChevronDown, ChevronUp, Ticket as TicketIcon, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTickets } from '@/lib/useTickets';

const STATUS = {
  upcoming:     { label: 'Upcoming',   cls: 'badge-success' },
  past:         { label: 'Past',       cls: 'badge' },
  cancelled:    { label: 'Cancelled',  cls: 'badge-error' },
  'checked-in': { label: 'Checked In', cls: 'badge-info'  },
};

export default function TicketsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { tickets, loading } = useTickets(user?.id);
  const [filter,   setFilter]   = useState<'all' | 'upcoming' | 'past'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  // ── Guards ──────────────────────────────────────────────────────────
  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center pb-nav">
      <div className="text-center space-y-4">
        <p className="text-4xl">🎟️</p>
        <h2 className="type-h2 text-[var(--text)]">Sign in to view your tickets</h2>
        <Link href="/login" className="btn btn-lg btn-grad text-white">Sign In</Link>
      </div>
    </div>
  );

  const filtered = tickets.filter(t => {
    if (filter === 'upcoming') return t.status === 'upcoming';
    if (filter === 'past')     return t.status === 'past' || t.status === 'checked-in';
    return true;
  });

  return (
    <div className="min-h-screen page-offset pb-nav" style={{ background: 'var(--bg-secondary)' }}>

      {/* Header */}
      <div className="border-b border-[var(--border)]" style={{ background: 'var(--bg)' }}>
        <div className="container py-6 sm:py-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
            <p className="section-label">My Account</p>
            <h1 className="text-2xl sm:text-4xl font-black text-[var(--text)] mb-1.5">My Tickets</h1>
            <p className="text-sm text-[var(--text-muted)]">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} in your wallet</p>
          </motion.div>
        </div>
      </div>

      <div className="container py-5 sm:py-8">

        {/* Filter + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
          <div className="flex gap-2">
            {(['all', 'upcoming', 'past'] as const).map(f => (
              <motion.button key={f} onClick={() => setFilter(f)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className={`btn btn-sm capitalize transition-all ${filter === f ? 'btn-grad text-white' : 'btn-ghost'}`}>
                {f}
              </motion.button>
            ))}
          </div>
          <Link href="/events" className="btn btn-sm btn-grad text-white w-fit">
            <Plus size={13} /> Get Tickets
          </Link>
        </div>

        {/* Tickets list */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-4xl"
              style={{ background: 'var(--bg-tertiary)' }}>🎟️</div>
            <h3 className="type-h3 text-[var(--text)] mb-2">No tickets here</h3>
            <p className="type-sm text-[var(--text-muted)] mb-6">Discover events and grab your tickets!</p>
            <Link href="/events" className="btn btn-md btn-grad text-white">Browse Events</Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filtered.map((ticket, i) => {
              const s      = STATUS[ticket.status] || STATUS.past;
              const isOpen = expanded === ticket.id;
              const seed   = parseInt(ticket.ticketId.replace(/\D/g, '').slice(0, 6)) || 12345;

              return (
                <motion.div key={ticket.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: 'easeOut' }}
                  className="card rounded-2xl overflow-hidden">
                  <div className="flex flex-row">

                    {/* QR block */}
                    <div className="flex flex-col items-center justify-center p-3 border-r border-[var(--border)] bg-white dark:bg-black/10 shrink-0 w-[90px] sm:w-[120px]">
                      <div className="grid grid-cols-6 gap-[2px] mb-1.5">
                        {Array(36).fill(0).map((_, idx) => {
                          const isBlack = ((seed * (idx + 1) * 7919) % 3) !== 0;
                          return <div key={idx} className={`w-2.5 h-2.5 rounded-[2px] ${isBlack ? 'bg-gray-900 dark:bg-white' : 'bg-white dark:bg-gray-900'}`} />;
                        })}
                      </div>
                      <p className="text-[8px] font-mono text-[var(--text-muted)] text-center leading-tight">
                        {ticket.ticketId.slice(0, 14)}
                      </p>
                    </div>

                    {/* Info block */}
                    <div className="p-4 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <span className={`badge ${s.cls} mb-2`}>{s.label}</span>
                          <h3 className="type-h3 text-[var(--text)] leading-tight line-clamp-2">{ticket.event.title}</h3>
                        </div>
                        <button onClick={() => setExpanded(isOpen ? null : ticket.id)}
                          className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shrink-0 mt-1">
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-[var(--text-muted)] mb-4">
                        <span className="flex items-center gap-1.5"><Calendar size={11} />{ticket.event.date}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={11} className="shrink-0" /><span className="truncate">{ticket.event.venue}</span></span>
                        <span className="flex items-center gap-1.5"><TicketIcon size={11} />{ticket.tier.name} × {ticket.quantity}</span>
                        <span className="font-semibold text-[var(--text)]">${ticket.totalAmount}</span>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="overflow-hidden">
                            <div className="border-t border-[var(--border)] pt-3 mb-4 space-y-1.5 text-xs text-[var(--text-muted)]">
                              <div className="flex justify-between"><span>Holder</span><span className="text-[var(--text)] font-medium">{ticket.holderName}</span></div>
                              <div className="flex justify-between"><span>Email</span><span className="text-[var(--text)] font-medium">{ticket.holderEmail}</span></div>
                              <div className="flex justify-between"><span>Purchased</span><span className="text-[var(--text)] font-medium">{new Date(ticket.purchasedAt).toLocaleDateString()}</span></div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => {
                          const msg = `🎟️ ${ticket.event.title}\n📅 ${ticket.event.date} · ${ticket.event.time}\n📍 ${ticket.event.venue}\n${ticket.tier.name} × ${ticket.quantity}\nID: ${ticket.ticketId}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                        }} className="btn btn-sm btn-ghost gap-1.5">📱 Share</button>
                        <button className="btn btn-sm btn-ghost gap-1.5"><Download size={12} /> Download</button>
                        <Link href={`/events/${ticket.event.slug || ticket.event.id}`} className="btn btn-sm btn-ghost gap-1.5">👁️ Event</Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
