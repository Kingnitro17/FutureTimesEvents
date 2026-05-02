'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_EVENTS } from '@/lib/mockData';
import { TicketTier, TableOption } from '@/types';
import { ArrowLeft, Calendar, MapPin, Users, ShieldCheck, ChevronRight } from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

export default function EventDetailPage() {
  const { id } = useParams();
  const router  = useRouter();
  const event   = MOCK_EVENTS.find(e => e.id === id);
  const [tier,    setTier]    = useState<TicketTier | null>(null);
  const [qty,     setQty]     = useState(1);
  const [table,   setTable]   = useState<TableOption | null>(null);
  const [bottles, setBottles] = useState<Record<string,number>>({});
  const [comment, setComment] = useState('');
  const [comments,setComments]= useState([
    { id:'c1', author:'Alex J.',    color:'#7222E3', text:"Can't wait for this! Last year was insane 🔥", time:'2h ago' },
    { id:'c2', author:'Kim L.',     color:'#FF55C2', text:'Anyone know if they have the silent disco stage?', time:'5h ago' },
    { id:'c3', author:'Marcus R.',  color:'#2CC4EA', text:'VIP section is so worth it. The views are unreal.', time:'1d ago' },
  ]);

  if (!event) return (
    <div className="min-h-screen flex items-center justify-center page-offset">
      <div className="text-center card p-10 rounded-3xl">
        <div className="text-6xl mb-5">🔍</div>
        <h2 className="type-h3 text-[var(--text)] mb-3">Event not found</h2>
        <Link href="/events" className="btn btn-md btn-outline">Back to events</Link>
      </div>
    </div>
  );

  const totalBottles = Object.entries(bottles).reduce((sum, [bid, q]) => {
    const item = event.bottleService?.find(b => b.id === bid);
    return sum + (item ? item.price * q : 0);
  }, 0);
  const totalPrice = (tier ? tier.price * qty : 0) + (table ? table.price : 0) + totalBottles;
  const pct = Math.round((event.attendees / event.capacity) * 100);

  const GRAD_MAP: Record<string, string> = {
    music:    'linear-gradient(135deg,#FF55C2,#7222E3)',
    tech:     'linear-gradient(135deg,#1D5BFF,#C7FE17)',
    art:      'linear-gradient(135deg,#DD1FFF,#24D8FB)',
    food:     'linear-gradient(135deg,#FFBC73,#FF00B9)',
    wellness: 'linear-gradient(135deg,#46FFAB,#A02EFF)',
    sports:   'linear-gradient(135deg,#2CC4EA,#533885)',
  };
  const catGrad = GRAD_MAP[event.category] || 'linear-gradient(135deg,#FF55C2,#7222E3)';

  const handleCheckout = () => {
    if (!tier && !table) return;
    const checkoutData = { eventId: event.id, tier, qty, table, bottles, total: totalPrice };
    localStorage.setItem('ed-checkout', JSON.stringify(checkoutData));
    router.push(`/checkout/${event.id}`);
  };

  return (
    <div className="min-h-screen page-offset bg-[var(--bg)]">

      {/* Hero Banner */}
      <div className="relative h-[50vh] min-h-[400px] max-h-[600px] overflow-hidden">
        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.6) 50%,var(--bg) 100%)' }} />

        <div className="absolute top-6 left-6 z-20">
          <Link href="/events" className="btn btn-sm btn-ghost bg-black/20 backdrop-blur-md text-white border-white/10 hover:bg-black/40">
            <ArrowLeft size={16} /> Back
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 pb-10">
          <div className="container">
            <motion.div {...fadeUp(0)}>
              <span className="badge text-white mb-3" style={{ background: catGrad }}>{event.categoryLabel}</span>
              <h1 className="text-2xl sm:text-4xl font-black text-white mb-3 drop-shadow-lg max-w-4xl leading-tight uppercase tracking-wide">{event.title}</h1>
              <div className="flex flex-wrap gap-3 text-[13px] text-white/90 font-medium drop-shadow">
                <span className="flex items-center gap-1.5"><Calendar size={13}/> {event.date} · {event.time}</span>
                <span className="flex items-center gap-1.5"><MapPin size={13}/> {event.venue}</span>
                <span className="flex items-center gap-1.5"><Users size={13}/> {event.attendees.toLocaleString()} attending</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-6 sm:py-12 pb-32">
        <div className="grid lg:grid-cols-[1fr_400px] gap-8 xl:gap-16 items-start">

          {/* Left Column */}
          <div className="space-y-6 sm:space-y-12">
            
            {/* Lineup */}
            {event.lineup && event.lineup.length > 0 && (
              <motion.section {...fadeUp(0.1)}>
                <h2 className="text-base font-bold text-[var(--text)] mb-4">Lineup</h2>
                <div className="flex flex-wrap gap-3">
                  {event.lineup.map((artist, i) => (
                    <div key={artist} className="px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-sm"
                      style={{ background: ['linear-gradient(135deg,#2CC4EA,#533885)','linear-gradient(135deg,#FF55C2,#7222E3)','linear-gradient(135deg,#46FFAB,#A02EFF)','linear-gradient(135deg,#1D5BFF,#C7FE17)'][i % 4] }}>
                      {artist}
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* About */}
            <motion.section {...fadeUp(0.15)}>
              <h2 className="text-base font-bold text-[var(--text)] mb-3">About</h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{event.longDescription}</p>
            </motion.section>

            {/* Tickets */}
            <motion.section {...fadeUp(0.2)}>
              <h2 className="text-base font-bold text-[var(--text)] mb-4">Tickets</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {event.ticketTiers.map(t => (
                  <button key={t.id} onClick={() => setTier(tier?.id === t.id ? null : t)}
                    className={`card p-5 text-left transition-all ${tier?.id === t.id ? 'border-[var(--accent)] shadow-[0_0_0_2px_rgba(var(--accent-rgb),0.2)]' : 'hover:border-[var(--border-hover)]'}`}>
                    <div className="h-1.5 w-12 rounded-full mb-4" style={{ background: t.gradient }} />
                    <h3 className="text-base font-bold text-[var(--text)] mb-1">{t.name}</h3>
                    <div className="type-h2 mb-2" style={{ background: t.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {t.price === 0 ? 'Free' : `$${t.price}`}
                    </div>
                    <p className="type-caption text-[var(--text-muted)] mb-4">{t.description}</p>
                    <ul className="space-y-1.5 mb-4 border-t border-[var(--border)] pt-4">
                      {t.perks.map(p => (
                        <li key={p} className="type-caption text-[var(--text-muted)] flex items-start gap-2">
                          <span className="text-green-500 shrink-0">✓</span> <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between type-caption text-[var(--text-muted)] mb-2">
                      <span>{t.available} left</span>
                      <span>{Math.round((t.available/t.total)*100)}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(1 - t.available / t.total) * 100}%`, background: t.gradient }} />
                    </div>
                  </button>
                ))}
              </div>
            </motion.section>

            {/* Discussion */}
            <motion.section {...fadeUp(0.25)}>
              <h2 className="text-base font-bold text-[var(--text)] mb-4">Discussion</h2>
              <div className="card p-6">
                <div className="flex gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm text-white font-bold shrink-0" style={{ background: 'var(--grad-primary)' }}>AJ</div>
                  <div className="flex-1 flex flex-col sm:flex-row gap-3">
                    <input value={comment} onChange={e => setComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) { setComments(c => [{ id: `c${Date.now()}`, author: 'You', color: '#7222E3', text: comment, time: 'Just now' }, ...c]); setComment(''); } }}
                      placeholder="Add a comment…"
                      className="input flex-1" />
                    <button onClick={() => { if (comment.trim()) { setComments(c => [{ id: `c${Date.now()}`, author: 'You', color: '#7222E3', text: comment, time: 'Just now' }, ...c]); setComment(''); } }}
                      className="btn btn-md btn-grad">Post</button>
                  </div>
                </div>
                <div className="space-y-6">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm text-white font-bold" style={{ background: c.color }}>
                        {c.author.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[var(--text)] text-sm">{c.author}</span>
                          <span className="type-caption text-[var(--text-muted)]">{c.time}</span>
                        </div>
                        <p className="type-sm text-[var(--text-muted)]">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

          </div>

          {/* Right Column (Checkout Sidebar) */}
          <motion.div {...fadeUp(0.3)} className="sticky top-[calc(var(--nav-h)+24px)]">
            <div className="card rounded-3xl p-4 sm:p-8">
              <h3 className="text-base font-bold text-[var(--text)] mb-4">Order Summary</h3>

              {(!tier && !table) ? (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] mb-6">
                  <TicketTierIcon />
                  <p className="type-sm font-medium text-[var(--text-muted)] mt-4">Select a ticket or table to continue.</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6 border-b border-[var(--border)] pb-6">
                  {tier && (
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm text-[var(--text)]">{tier.name} Ticket</p>
                        <p className="type-caption text-[var(--text-muted)]">${tier.price} × {qty}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-1">
                          <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]">−</button>
                          <span className="w-6 text-center text-xs font-bold">{qty}</span>
                          <button onClick={() => setQty(qty + 1)} className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]">+</button>
                        </div>
                        <p className="font-bold text-sm text-[var(--text)]">${tier.price * qty}</p>
                      </div>
                    </div>
                  )}

                  {table && (
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm text-[var(--text)]">Table: {table.name}</p>
                        <p className="type-caption text-[var(--text-muted)]">{table.seats} seats included</p>
                      </div>
                      <p className="font-bold text-sm text-[var(--text)]">${table.price}</p>
                    </div>
                  )}

                  {Object.entries(bottles).map(([bid, q]) => {
                    if (q === 0) return null;
                    const item = event.bottleService?.find(b => b.id === bid);
                    if (!item) return null;
                    return (
                      <div key={bid} className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm text-[var(--text)]">{item.name}</p>
                          <p className="type-caption text-[var(--text-muted)]">${item.price} × {q}</p>
                        </div>
                        <p className="font-bold text-sm text-[var(--text)]">${item.price * q}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-semibold text-[var(--text-muted)]">Total Amount</span>
                <span className="type-h2 text-[var(--text)]">${totalPrice}</span>
              </div>

              <button
                disabled={!tier && !table}
                onClick={handleCheckout}
                className={`btn btn-lg w-full text-white text-base ${(!tier && !table) ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={(!tier && !table) ? { background: 'var(--border)' } : { background: catGrad, boxShadow: `0 4px 20px rgba(0,0,0,0.15)` }}
              >
                Proceed to Checkout
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 type-caption text-[var(--text-muted)]">
                <ShieldCheck size={14} /> 100% Secure Checkout via Stripe
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed left-0 right-0 bottom-0 z-40 p-4">
        <div className="glass-strong rounded-3xl px-4 py-3 border border-[var(--border)] shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="type-caption text-[var(--text-muted)]">Total</p>
              <p className="text-base font-bold text-[var(--text)]">${totalPrice}</p>
            </div>
            <button
              disabled={!tier && !table}
              onClick={handleCheckout}
              className={`btn btn-md text-white ${(!tier && !table) ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={(!tier && !table) ? { background: 'var(--border)' } : { background: catGrad }}
            >
              {(!tier && !table) ? 'Select a ticket' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketTierIcon() {
  return (
    <svg className="mx-auto text-[var(--border-hover)] w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
    </svg>
  );
}
