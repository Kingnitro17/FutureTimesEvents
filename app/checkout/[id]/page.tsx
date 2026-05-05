'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { ShieldCheck, MapPin, Calendar, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { getEventById, purchaseTicket } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { generateTicket, getLoyaltyPoints } from '@/lib/ticketGenerator';
import { Ticket, Event } from '@/types';
import EventDateBadge from '@/components/events/EventDateBadge';

const stepVariants = {
  enter:  { opacity: 0, x: 20, scale: 0.98 },
  center: { opacity: 1, x: 0,  scale: 1 },
  exit:   { opacity: 0, x: -20, scale: 0.98 },
};

export default function CheckoutPage() {
  const { id } = useParams();
  const sp     = useSearchParams();
  const router = useRouter();

  const [event,   setEvent]   = useState<Event | null>(null);
  const [authUser,setAuthUser]= useState<any>(null);
  const tierId = sp.get('tier') || 'ga';
  const qty    = parseInt(sp.get('qty') || '1');

  const tier   = event?.ticketTiers.find(t => t.id === tierId) || event?.ticketTiers[0];

  const [step,    setStep]    = useState<'info'|'payment'|'success'>('info');
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket,  setTicket]  = useState<Ticket | null>(null);
  const [scrolled,setScrolled]= useState(false);

  const total  = (tier?.price || 0) * qty;
  const points = getLoyaltyPoints(total);

  // Fetch event + auth user on mount
  useEffect(() => {
    if (!id) return;
    getEventById(id as string).then(setEvent);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
        setName(session.user.user_metadata?.full_name || '');
        setEmail(session.user.email || '');
      }
    });
  }, [id]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 120);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const handlePurchase = async () => {
    if (!event || !tier) return;
    setLoading(true);

    const isRealEvent = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.id);

    if (authUser && isRealEvent) {
      // Save to Supabase
      const result = await purchaseTicket({
        eventId: event.id,
        tierId: tier.id,
        userId: authUser.id,
        quantity: qty,
        totalAmount: total,
        holderName: name,
        holderEmail: email,
      });
      if (result) {
        const t = generateTicket(event, tier, qty, name, email);
        t.ticketId = result.ticketId;
        setTicket(t);
        setStep('success');
        toast.success('Ticket confirmed! 🎉');
      } else {
        toast.error('Purchase failed. Please try again.');
      }
    } else {
      // Fallback: save to localStorage (mock/guest)
      await new Promise(r => setTimeout(r, 1800));
      const t = generateTicket(event, tier, qty, name, email);
      const stored = JSON.parse(localStorage.getItem('ed-tickets') || '[]');
      localStorage.setItem('ed-tickets', JSON.stringify([t, ...stored]));
      setTicket(t);
      setStep('success');
      toast.success('Ticket confirmed! Check your email. 🎉');
    }
    setLoading(false);
  };

  if (!event || !tier) return (
    <div className="min-h-screen page-offset flex items-center justify-center">
      <div className="card p-10 text-center rounded-3xl">
        <div className="text-5xl mb-4">❌</div>
        <h3 className="type-h3 text-[var(--text)] mb-3">Event not found</h3>
        <button onClick={() => router.push('/events')} className="btn btn-sm btn-outline">Back to Events</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen page-offset pb-32" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container max-w-4xl py-12">

        {/* Progress steps */}
        {step !== 'success' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-12">
            {(['info', 'payment'] as const).map((s, i) => {
              const active = step === s;
              const past = s === 'info' && step === 'payment';
              return (
                <div key={s} className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      background: active || past ? 'linear-gradient(135deg,#FF55C2,#7222E3)' : 'var(--bg-card)',
                      scale: active ? 1.1 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-[var(--border)]"
                    style={{ color: active || past ? '#fff' : 'var(--text-muted)' }}
                  >
                    {past ? <Check size={14} /> : i + 1}
                  </motion.div>
                  <span className={`text-sm font-semibold ${active ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                    {s === 'info' ? 'Your Details' : 'Payment'}
                  </span>
                  {i === 0 && (
                    <motion.div
                      animate={{ background: step === 'payment' ? 'var(--accent)' : 'var(--border)' }}
                      className="w-12 h-1 rounded-full mx-1 opacity-50"
                    />
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Success state */}
        <AnimatePresence mode="wait">
          {step === 'success' && ticket ? (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center py-8">
              
              <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 1.2, repeat: 3, ease: 'easeInOut' }}
                className="text-7xl mb-6 drop-shadow-xl">🎉</motion.div>
              <h1 className="type-h1 text-[var(--text)] mb-3">You&apos;re going to {event.title}!</h1>
              <p className="type-body text-[var(--text-muted)] mb-10">Your ticket has been secured and sent to <span className="font-bold">{email}</span>.</p>

              <div className="max-w-sm mx-auto card p-6 rounded-3xl mb-8 border-t-4" style={{ borderTopColor: 'var(--accent)' }}>
                <h2 className="type-h3 text-[var(--text)] mb-2">{event.title}</h2>
                <p className="type-caption text-[var(--text-muted)] mb-6 flex items-center gap-2 justify-center font-medium">
                  <Calendar size={13}/> {event.date} · <MapPin size={13}/> {event.venue}
                </p>

                {/* QR Code */}
                <div className="bg-white rounded-2xl p-4 mb-4 mx-auto w-fit shadow-md">
                  <div className="grid grid-cols-8 gap-[2px]">
                    {Array(64).fill(0).map((_, i) => {
                      const seed = parseInt(ticket.ticketId.replace(/\D/g, '').slice(0, 8));
                      const isBlack = ((seed * (i + 1) * 7919) % 3) !== 0;
                      return <div key={i} className={`w-3.5 h-3.5 rounded-[2px] ${isBlack ? 'bg-black' : 'bg-white'}`} />;
                    })}
                  </div>
                </div>

                <p className="type-caption font-mono text-[var(--text-muted)] mb-4">{ticket.ticketId}</p>
                <div className="flex items-center justify-between type-sm text-[var(--text-muted)] mb-4 pb-4 border-b border-[var(--border)]">
                  <span>{tier.name} × {qty}</span>
                  <span className="font-bold text-[var(--text)]">${total}</span>
                </div>
                <div className="p-3 rounded-xl text-xs text-center font-bold"
                  style={{ background: 'linear-gradient(135deg,rgba(70,255,171,0.15),rgba(160,46,255,0.15))', color: '#46FFAB' }}>
                  +{points} Loyalty Points Earned! 🌟
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => router.push('/tickets')} className="btn btn-md btn-grad text-white">
                  View My Tickets
                </button>
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`🎟️ I just got tickets to ${event.title}!\n📅 ${event.date} · ${event.time}\n📍 ${event.venue}\n\nJoin me! → eventsdistro.app/events/${event.id}`)}`, '_blank')}
                  className="btn btn-md btn-outline text-green-500 border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20">
                  📱 Share via WhatsApp
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" className="grid md:grid-cols-3 gap-8">
              
              {/* Form Flow */}
              <div className="md:col-span-2">
                <AnimatePresence mode="wait">
                  
                  {step === 'info' && (
                    <motion.div key="info" variants={stepVariants} initial="enter" animate="center" exit="exit" className="card rounded-3xl p-6 sm:p-10">
                      <h2 className="type-h3 text-[var(--text)] mb-6">Your Information</h2>
                      <div className="space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-[var(--text)]">Full Name</label>
                          <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-[var(--text)]">Email Address</label>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-[var(--text)]">Phone (optional)</label>
                          <input type="tel" placeholder="+1 (555) 000-0000" className="input" />
                        </div>
                      </div>
                      <button onClick={() => setStep('payment')} className="btn btn-lg w-full btn-primary mt-8">
                        Continue to Payment <ArrowLeft className="rotate-180 shrink-0" size={16} />
                      </button>
                    </motion.div>
                  )}

                  {step === 'payment' && (
                    <motion.div key="payment" variants={stepVariants} initial="enter" animate="center" exit="exit" className="card rounded-3xl p-6 sm:p-10">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="type-h3 text-[var(--text)]">Payment Details</h2>
                        <button onClick={() => setStep('info')} className="btn btn-sm btn-ghost px-2">
                          <ArrowLeft size={16} /> Back
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 p-3 rounded-xl mb-6 text-sm font-semibold text-blue-500 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/50">
                        <ShieldCheck size={16} className="shrink-0" /> Demo Mode — No real charge
                      </div>

                      <div className="space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-[var(--text)]">Card Number</label>
                          <input type="text" defaultValue="4242 4242 4242 4242" readOnly className="input font-mono text-lg" />
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-[var(--text)]">Expiry</label>
                            <input type="text" defaultValue="12/28" readOnly className="input font-mono" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-[var(--text)]">CVV</label>
                            <input type="text" defaultValue="123" readOnly className="input font-mono" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-[var(--text)]">Name on Card</label>
                          <input type="text" defaultValue={name} className="input" />
                        </div>
                      </div>

                      <button onClick={handlePurchase} disabled={loading} className="btn btn-lg w-full btn-grad text-white mt-8">
                        {loading ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : `Complete Purchase — $${total}`}
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Order Summary Sidebar */}
              <div>
                <div className="card rounded-3xl p-6 sticky top-[calc(var(--nav-h)+24px)]">
                  <h3 className="type-h3 text-[var(--text)] mb-5">Order Summary</h3>
                  
                  <div className="relative h-28 rounded-xl overflow-hidden mb-5">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute top-3 left-3">
                      <EventDateBadge date={event.date} size="sm" />
                    </div>
                  </div>
                  <p className="text-base font-black text-[var(--text)] leading-tight line-clamp-2">
                    {event.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-1">
                    {event.venue}
                  </p>

                  <div className="space-y-3 type-sm text-[var(--text-muted)] mb-5">
                    <div className="flex justify-between"><span>{tier.name}</span><span>${tier.price}</span></div>
                    <div className="flex justify-between"><span>Quantity</span><span>× {qty}</span></div>
                    <div className="flex justify-between"><span>Service fee</span><span className="text-green-500 font-bold">Free</span></div>
                    <div className="flex justify-between font-bold type-h3 text-[var(--text)] pt-4 border-t border-[var(--border)] mt-2">
                      <span>Total</span><span>${total}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl type-caption text-center font-bold bg-[var(--bg-tertiary)] text-[var(--accent)]">
                    🌟 Earn {points} Loyalty Points
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Sticky CTA */}
      <AnimatePresence>
        {step !== 'success' && scrolled && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 sm:hidden border-t border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-xl p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center justify-between max-w-lg mx-auto">
              <div>
                <p className="type-caption text-[var(--text-muted)]">{tier.name} × {qty}</p>
                <p className="type-h3 text-[var(--text)]">${total}</p>
              </div>
              <button
                onClick={step === 'info' ? () => setStep('payment') : handlePurchase}
                disabled={loading}
                className="btn btn-md btn-grad text-white"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : step === 'info' ? 'Continue' : `Pay $${total}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
