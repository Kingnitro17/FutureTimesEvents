'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserTickets } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { Ticket } from '@/types';
import {
  Calendar, MapPin, Download, ChevronDown, ChevronUp,
  Ticket as TicketIcon, Plus, Loader2, Share2, QrCode,
  Clock, Users, Star, ArrowRight
} from 'lucide-react';

/* ── Status config ── */
const STATUS_CFG = {
  upcoming:     { label: 'Upcoming',   dot: '#46FFAB', bg: 'rgba(70,255,171,0.12)',  border: 'rgba(70,255,171,0.3)'  },
  past:         { label: 'Past',       dot: '#888',    bg: 'rgba(136,136,136,0.1)', border: 'rgba(136,136,136,0.2)' },
  cancelled:    { label: 'Cancelled',  dot: '#FF55C2', bg: 'rgba(255,85,194,0.12)', border: 'rgba(255,85,194,0.3)'  },
  'checked-in': { label: 'Checked In', dot: '#2CC4EA', bg: 'rgba(44,196,234,0.12)', border: 'rgba(44,196,234,0.3)'  },
};

const GRAD_MAP: Record<string, string> = {
  music:    'linear-gradient(135deg,#FF55C2,#7222E3)',
  sports:   'linear-gradient(135deg,#2CC4EA,#533885)',
  art:      'linear-gradient(135deg,#DD1FFF,#24D8FB)',
  food:     'linear-gradient(135deg,#FFBC73,#FF00B9)',
  wellness: 'linear-gradient(135deg,#46FFAB,#A02EFF)',
  tech:     'linear-gradient(135deg,#1D5BFF,#C7FE17)',
};

/* ── Mini QR generator (no lib needed) ── */
function MiniQR({ seed, size = 7 }: { seed: string; size?: number }) {
  const cells = Array(size * size).fill(0).map((_, i) => {
    const hash = seed.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    return ((Math.abs(hash) * (i + 1) * 2654435761) % 256) > 100;
  });
  return (
    <div className="grid gap-[1.5px] p-2 bg-white rounded-lg"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 56, height: 56 }}>
      {cells.map((b, i) => (
        <div key={i} className="rounded-[1px]" style={{ background: b ? '#111' : '#fff' }} />
      ))}
    </div>
  );
}

/* ── Large QR for expanded view ── */
function LargeQR({ seed }: { seed: string }) {
  const size = 12;
  const cells = Array(size * size).fill(0).map((_, i) => {
    const hash = seed.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    return ((Math.abs(hash) * (i + 1) * 2654435761) % 256) > 100;
  });
  return (
    <div className="grid gap-[2px] p-4 bg-white rounded-2xl shadow-lg mx-auto"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 160, height: 160 }}>
      {cells.map((b, i) => (
        <div key={i} className="rounded-[1px]" style={{ background: b ? '#111' : '#fff' }} />
      ))}
    </div>
  );
}

/* ── Individual ticket card ── */
function TicketCard({ ticket, index }: { ticket: Ticket; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[ticket.status as keyof typeof STATUS_CFG] || STATUS_CFG.past;
  const grad = GRAD_MAP[ticket.event.category] || 'linear-gradient(135deg,#FF55C2,#7222E3)';
  const seed = ticket.ticketId || ticket.id;

  const share = () => {
    const msg = `🎟️ ${ticket.event.title}\n📅 ${ticket.event.date} · ${ticket.event.time}\n📍 ${ticket.event.venue}\n${ticket.tier.name} × ${ticket.quantity}\nID: ${ticket.ticketId}`;
    if (navigator.share) {
      navigator.share({ title: ticket.event.title, text: msg });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: 'easeOut' }}
    >
      <div className="rounded-3xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl"
        style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>

        {/* ── Gradient accent bar ── */}
        <div className="h-[3px]" style={{ background: grad }} />

        {/* ── Main ticket body ── */}
        <div className="flex">

          {/* QR + perforated edge */}
          <div className="flex shrink-0">
            <div className="flex flex-col items-center justify-center px-4 py-5 gap-2"
              style={{ background: 'var(--bg-secondary)', minWidth: 88 }}>
              <MiniQR seed={seed} />
              <p className="text-[8px] font-mono text-center leading-tight" style={{ color: 'var(--text-muted)' }}>
                {ticket.ticketId.slice(0, 12)}
              </p>
            </div>

            {/* Perforated divider */}
            <div className="relative flex flex-col items-center justify-center w-5 shrink-0"
              style={{ background: 'var(--bg-card)' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full"
                style={{ background: 'var(--bg-secondary)' }} />
              <div className="w-px h-full" style={{
                backgroundImage: 'repeating-linear-gradient(to bottom, var(--border) 0px, var(--border) 6px, transparent 6px, transparent 12px)'
              }} />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full"
                style={{ background: 'var(--bg-secondary)' }} />
            </div>
          </div>

          {/* ── Ticket info ── */}
          <div className="flex-1 p-4 sm:p-5 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                {/* Status pill */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-2"
                  style={{ background: cfg.bg, color: cfg.dot, border: `1px solid ${cfg.border}` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                  {cfg.label}
                </span>
                <h3 className="text-base sm:text-lg font-black leading-tight line-clamp-2" style={{ color: 'var(--text)' }}>
                  {ticket.event.title}
                </h3>
              </div>

              {/* Tier badge */}
              <div className="shrink-0 text-right">
                <div className="text-xs font-bold px-2 py-1 rounded-lg text-white"
                  style={{ background: grad }}>
                  {ticket.tier.name}
                </div>
                <p className="text-xs mt-1 font-black" style={{ color: 'var(--text)' }}>
                  ${ticket.totalAmount}
                </p>
              </div>
            </div>

            {/* Event details */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Calendar size={11} style={{ color: 'var(--accent)' }} />
                {ticket.event.date}
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock size={11} style={{ color: 'var(--accent)' }} />
                {ticket.event.time}
              </span>
              <span className="flex items-center gap-1.5 text-xs col-span-2 truncate" style={{ color: 'var(--text-muted)' }}>
                <MapPin size={11} className="shrink-0" style={{ color: 'var(--accent)' }} />
                <span className="truncate">{ticket.event.venue}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <TicketIcon size={11} style={{ color: 'var(--accent)' }} />
                × {ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={share}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <Share2 size={11} /> Share
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <Download size={11} /> Save
              </button>
              <Link href={`/events/${ticket.eventId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ml-auto transition-all hover:opacity-90 active:scale-95 text-white"
                style={{ background: grad }}>
                View Event <ArrowRight size={11} />
              </Link>
              <button onClick={() => setExpanded(v => !v)}
                className="p-1.5 rounded-xl transition-all hover:opacity-80"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Expanded QR + details ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="border-t" style={{ borderColor: 'var(--border)', borderStyle: 'dashed' }}>
                <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
                  {/* Large QR */}
                  <div className="flex flex-col items-center gap-2">
                    <LargeQR seed={seed} />
                    <p className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                      {ticket.ticketId}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Scan at venue entrance</p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 w-full space-y-3">
                    <h4 className="text-sm font-black" style={{ color: 'var(--text)' }}>Ticket Details</h4>
                    {[
                      { label: 'Holder',    value: ticket.holderName },
                      { label: 'Email',     value: ticket.holderEmail },
                      { label: 'Tier',      value: `${ticket.tier.name} × ${ticket.quantity}` },
                      { label: 'Total',     value: `$${ticket.totalAmount}` },
                      { label: 'Purchased', value: new Date(ticket.purchasedAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) },
                      { label: 'Status',    value: cfg.label },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b text-sm"
                        style={{ borderColor: 'var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>{value}</span>
                      </div>
                    ))}

                    {/* Loyalty earned */}
                    <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-bold"
                      style={{ background: 'rgba(70,255,171,0.08)', color: '#46FFAB', border: '1px solid rgba(70,255,171,0.15)' }}>
                      <Star size={12} />
                      +{Math.floor(ticket.totalAmount * 10)} Loyalty Points Earned
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Main page ── */
export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<'all'|'upcoming'|'past'|'cancelled'>('all');
  const [authed,  setAuthed]  = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthed(true);
        const data = await getUserTickets(session.user.id);
        setTickets(data);
      } else {
        // Guest: localStorage + mock fallback
        try {
          const stored = JSON.parse(localStorage.getItem('ed-tickets') || '[]');
          const { MOCK_TICKETS } = await import('@/lib/mockData');
          setTickets(stored.length > 0 ? [...stored, ...MOCK_TICKETS] : MOCK_TICKETS);
        } catch {
          const { MOCK_TICKETS } = await import('@/lib/mockData');
          setTickets(MOCK_TICKETS);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const counts = {
    all:       tickets.length,
    upcoming:  tickets.filter(t => t.status === 'upcoming').length,
    past:      tickets.filter(t => t.status === 'past' || t.status === 'checked-in').length,
    cancelled: tickets.filter(t => t.status === 'cancelled').length,
  };

  const filtered = tickets.filter(t => {
    if (filter === 'upcoming')  return t.status === 'upcoming';
    if (filter === 'past')      return t.status === 'past' || t.status === 'checked-in';
    if (filter === 'cancelled') return t.status === 'cancelled';
    return true;
  });

  const totalSpent = tickets.reduce((s, t) => s + t.totalAmount, 0);
  const loyaltyPts = Math.floor(totalSpent * 10);

  if (loading) return (
    <div className="min-h-screen page-offset flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading your tickets…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen page-offset pb-nav" style={{ background: 'var(--bg-secondary)' }}>

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden border-b" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        {/* Gradient orb */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle,#7222E3,transparent)', transform: 'translate(30%,-30%)' }} />

        <div className="container relative z-10 py-10 sm:py-14">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="section-label mb-2">My Account</p>
            <h1 className="text-3xl sm:text-5xl font-black mb-2" style={{ color: 'var(--text)' }}>My Tickets</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
              {tickets.length === 0 ? 'No tickets yet — find your first event below' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} in your wallet`}
            </p>

            {/* Stats row */}
            {tickets.length > 0 && (
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: '🎟️', val: counts.upcoming, label: 'Upcoming',      color: '#46FFAB' },
                  { icon: '✅', val: counts.past,     label: 'Attended',      color: '#2CC4EA' },
                  { icon: '💰', val: `$${totalSpent}`, label: 'Total Spent',  color: '#FFBC73' },
                  { icon: '⭐', val: loyaltyPts,       label: 'Points Earned', color: '#FF55C2' },
                ].map(({ icon, val, label, color }, i) => (
                  <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-lg font-black leading-none" style={{ color }}>{val}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="container py-6 sm:py-10">

        {/* ── FILTER TABS + CTA ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {([
              { id: 'all',       label: 'All',       count: counts.all },
              { id: 'upcoming',  label: 'Upcoming',  count: counts.upcoming },
              { id: 'past',      label: 'Past',      count: counts.past },
              { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            ] as const).map(f => (
              <motion.button key={f.id} onClick={() => setFilter(f.id)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold whitespace-nowrap transition-all"
                style={filter === f.id
                  ? { background: 'linear-gradient(135deg,#FF55C2,#7222E3)', color: '#fff', boxShadow: '0 4px 16px rgba(114,34,227,0.3)' }
                  : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {f.label}
                {f.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={{ background: filter === f.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)' }}>
                    {f.count}
                  </span>
                )}
              </motion.button>
            ))}
          </div>

          <Link href="/events"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 w-fit shrink-0"
            style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)', boxShadow: '0 4px 16px rgba(114,34,227,0.25)' }}>
            <Plus size={14} /> Get More Tickets
          </Link>
        </div>

        {/* ── TICKET LIST ── */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center py-24 rounded-3xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl"
                style={{ background: 'linear-gradient(135deg,rgba(255,85,194,0.15),rgba(114,34,227,0.15))' }}>🎟️</div>
              <h3 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>
                {filter === 'all' ? 'No tickets yet' : `No ${filter} tickets`}
              </h3>
              <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                {filter === 'all' ? 'Start exploring events and grab your first ticket!' : `You don't have any ${filter} tickets.`}
              </p>
              <Link href="/events"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
                Browse Events <ArrowRight size={15} />
              </Link>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4">
              {filtered.map((ticket, i) => (
                <TicketCard key={ticket.id} ticket={ticket} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SIGN IN CTA (guests only) ── */}
        {!authed && tickets.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="mt-8 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ background: 'linear-gradient(135deg,rgba(114,34,227,0.1),rgba(255,85,194,0.08))', border: '1px solid rgba(114,34,227,0.2)' }}>
            <div>
              <p className="font-black text-base" style={{ color: 'var(--text)' }}>🔐 Save your tickets forever</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create a free account to sync your tickets across devices</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/auth/login" className="btn btn-sm btn-ghost">Sign In</Link>
              <Link href="/auth/signup" className="btn btn-sm text-white"
                style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>Create Account</Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
