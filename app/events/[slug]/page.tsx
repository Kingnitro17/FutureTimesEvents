'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, ChevronDown, AlertCircle } from 'lucide-react';
import TicketClaimForm from '@/components/events/TicketClaimForm';
import QRDisplay from '@/components/tickets/QRDisplay';
import CountdownTimer from '@/components/events/CountdownTimer';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity_available: number;
  claim_limit_per_contact: number;
  claim_opens_at: string | null;
  claim_closes_at: string | null;
  is_active: boolean;
}

interface EventData {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  long_description: string;
  category: string;
  category_label: string;
  starts_at: string;
  ends_at: string | null;
  doors_open_at: string | null;
  timezone: string;
  venue_name: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  cover_image_url: string | null;
  capacity: number;
  status: string;
  dress_code: string | null;
  age_guidance: string | null;
  event_rules: string | null;
  organizer_name: string;
  contact_email: string | null;
  ticket_types: TicketType[];
  event_faqs: { id: string; question: string; answer: string; sort_order: number }[];
  event_sponsors: { id: string; name: string; logo_url: string | null; tier: string }[];
  event_schedule_items: { id: string; title: string; performer: string | null; starts_at: string; stage: string | null }[];
}

const GRAD_MAP: Record<string, string> = {
  music:    'linear-gradient(135deg,#FF55C2,#7222E3)',
  tech:     'linear-gradient(135deg,#1D5BFF,#C7FE17)',
  art:      'linear-gradient(135deg,#DD1FFF,#24D8FB)',
  food:     'linear-gradient(135deg,#FFBC73,#FF00B9)',
  wellness: 'linear-gradient(135deg,#46FFAB,#A02EFF)',
  sports:   'linear-gradient(135deg,#2CC4EA,#533885)',
  lounge:   'linear-gradient(135deg,#FF55C2,#7222E3)',
};

export default function EventSlugPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const supabase = getSupabaseBrowserClient();

  const [event,      setEvent]      = useState<EventData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [openFaqId,  setOpenFaqId]  = useState<string | null>(null);
  const [claimedTicketId,     setClaimedTicketId]     = useState<string | null>(null);
  const [claimedTicketNumber, setClaimedTicketNumber] = useState<string | null>(null);
  const [claimedQrToken,      setClaimedQrToken]      = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!slug) return;
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        ticket_types(*),
        event_faqs(*),
        event_sponsors(*),
        event_schedule_items(*)
      `)
      .eq('slug', slug)
      .in('status', ['published', 'sold_out', 'completed'])
      .single();

    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setEvent(data as unknown as EventData);
    setLoading(false);
  }, [slug]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center page-offset">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  );

  if (notFound || !event) return (
    <div className="min-h-screen flex items-center justify-center page-offset">
      <div className="text-center card p-10 rounded-3xl">
        <div className="text-6xl mb-5">🔍</div>
        <h2 className="type-h3 text-[var(--text)] mb-3">Event not found</h2>
        <p className="text-[var(--text-muted)] mb-5">This event may have been removed or the link is incorrect.</p>
        <Link href="/events" className="btn btn-md btn-outline">Browse Events</Link>
      </div>
    </div>
  );

  const grad = GRAD_MAP[event.category] ?? GRAD_MAP.lounge;
  const startsAt = new Date(event.starts_at);
  const isSoldOut = event.status === 'sold_out';
  const isCompleted = event.status === 'completed';

  return (
    <div className="min-h-screen page-offset pb-24">
      {/* Hero banner */}
      <div className="relative w-full h-72 sm:h-96 overflow-hidden">
        {event.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full" style={{ background: grad }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)' }} />

        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-3"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
            {event.category_label}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-black text-white leading-tight">
            {event.title}
          </h1>
          {event.subtitle && (
            <p className="text-white/80 text-lg mt-1">{event.subtitle}</p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: event details */}
          <div className="lg:col-span-2 space-y-8">

            {/* Key details */}
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
              <div className="glass rounded-2xl p-6 border border-[var(--border)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: grad }}>
                      <Calendar size={18} color="white" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] font-medium">Date</p>
                      <p className="font-bold text-[var(--text)]">
                        {startsAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: grad }}>
                      <Clock size={18} color="white" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] font-medium">Time</p>
                      <p className="font-bold text-[var(--text)]">
                        {startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        {event.ends_at && ` – ${new Date(event.ends_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                      {event.doors_open_at && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Doors open: {new Date(event.doors_open_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: grad }}>
                      <MapPin size={18} color="white" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] font-medium">Venue</p>
                      <p className="font-bold text-[var(--text)]">{event.venue_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{event.address}</p>
                      {(event.lat && event.lng) && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-purple-500 hover:underline mt-0.5 inline-block"
                        >
                          Get directions →
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: grad }}>
                      <Users size={18} color="white" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] font-medium">Capacity</p>
                      <p className="font-bold text-[var(--text)]">{event.capacity.toLocaleString()} people</p>
                      {isSoldOut && <p className="text-xs text-red-500 font-semibold mt-0.5">Sold out</p>}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Countdown */}
            {!isCompleted && (
              <CountdownTimer targetDate={event.starts_at} />
            )}

            {/* About */}
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.1 }}>
              <h2 className="text-xl font-bold text-[var(--text)] mb-3">About this event</h2>
              <div className="glass rounded-2xl p-6 border border-[var(--border)]">
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {event.long_description || event.description}
                </p>
              </div>
            </motion.div>

            {/* Event info badges */}
            {(event.dress_code || event.age_guidance || event.event_rules) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {event.dress_code && (
                  <div className="glass rounded-2xl p-4 border border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide mb-1">Dress Code</p>
                    <p className="font-semibold text-[var(--text)]">{event.dress_code}</p>
                  </div>
                )}
                {event.age_guidance && (
                  <div className="glass rounded-2xl p-4 border border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide mb-1">Age</p>
                    <p className="font-semibold text-[var(--text)]">{event.age_guidance}</p>
                  </div>
                )}
              </div>
            )}

            {/* Schedule */}
            {event.event_schedule_items?.length > 0 && (
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.15 }}>
                <h2 className="text-xl font-bold text-[var(--text)] mb-3">Lineup / Schedule</h2>
                <div className="glass rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                  {event.event_schedule_items
                    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
                    .map(item => (
                      <div key={item.id} className="px-5 py-4 flex items-center gap-4">
                        <div className="text-sm font-mono text-[var(--text-muted)] w-14 shrink-0">
                          {new Date(item.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--text)]">{item.title}</p>
                          {item.performer && <p className="text-sm text-[var(--text-muted)]">{item.performer}</p>}
                          {item.stage && <p className="text-xs text-purple-500">{item.stage}</p>}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </motion.div>
            )}

            {/* FAQs */}
            {event.event_faqs?.length > 0 && (
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.2 }}>
                <h2 className="text-xl font-bold text-[var(--text)] mb-3">FAQs</h2>
                <div className="space-y-2">
                  {event.event_faqs
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(faq => (
                      <div key={faq.id} className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
                        <button
                          onClick={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
                          className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                          aria-expanded={openFaqId === faq.id}
                        >
                          <p className="font-semibold text-[var(--text)] text-sm">{faq.question}</p>
                          <ChevronDown
                            size={16}
                            className={`text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${openFaqId === faq.id ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {openFaqId === faq.id && (
                          <div className="px-5 pb-4">
                            <p className="text-sm text-[var(--text-secondary)]">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: ticket claim / QR display */}
          <div className="lg:col-span-1">
            <div className="sticky top-[calc(var(--nav-h)+1rem)] space-y-4">

              {/* If already claimed this session — show QR */}
              {claimedTicketId && claimedQrToken ? (
                <motion.div
                  initial={{ opacity:0, scale:0.9 }}
                  animate={{ opacity:1, scale:1 }}
                  className="glass rounded-3xl p-6 border border-[var(--border)] space-y-4"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: grad }}>
                      <span className="text-2xl">🎟️</span>
                    </div>
                    <h3 className="font-black text-xl text-[var(--text)]">Your Ticket</h3>
                    <p className="text-[var(--text-muted)] text-sm">{claimedTicketNumber}</p>
                  </div>
                  <div className="flex justify-center">
                    <QRDisplay token={claimedQrToken} size={200} label={`Ticket QR for ${event.title}`} />
                  </div>
                  <p className="text-xs text-center text-[var(--text-muted)]">
                    Screenshot or save this QR code. Show it at the entrance.
                  </p>
                  <Link
                    href={`/ticket/${claimedTicketId}`}
                    className="block w-full py-3 rounded-2xl text-center font-bold text-white text-sm"
                    style={{ background: grad }}
                  >
                    View Full Ticket →
                  </Link>
                </motion.div>
              ) : (
                /* Claim form */
                <motion.div
                  initial={{ opacity:0, y:16 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ duration:0.4, delay:0.05 }}
                  className="glass rounded-3xl p-6 border border-[var(--border)]"
                >
                  {isCompleted ? (
                    <div className="text-center py-6">
                      <div className="text-4xl mb-3">✅</div>
                      <p className="font-bold text-[var(--text)]">Event completed</p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">Thank you for attending!</p>
                    </div>
                  ) : isSoldOut ? (
                    <div className="text-center py-6">
                      <div className="text-4xl mb-3">🔥</div>
                      <p className="font-black text-xl text-[var(--text)]">Sold Out</p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">All tickets have been claimed.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: grad }}>
                          <span className="text-sm">🎟️</span>
                        </div>
                        <div>
                          <h3 className="font-black text-lg text-[var(--text)]">Get Tickets</h3>
                          <p className="text-xs text-[var(--text-muted)]">Free · Instant · Secure</p>
                        </div>
                      </div>
                      <TicketClaimForm
                        event={event}
                        ticketTypes={event.ticket_types ?? []}
                        onSuccess={(id, num, token) => {
                          setClaimedTicketId(id);
                          setClaimedTicketNumber(num);
                          setClaimedQrToken(token);
                        }}
                      />
                    </>
                  )}
                </motion.div>
              )}

              {/* Organiser */}
              <div className="glass rounded-2xl p-4 border border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] font-medium">Organised by</p>
                <p className="font-bold text-[var(--text)] mt-0.5">{event.organizer_name}</p>
                {event.contact_email && (
                  <a href={`mailto:${event.contact_email}`} className="text-xs text-purple-500 hover:underline mt-0.5 block">
                    Contact organiser
                  </a>
                )}
              </div>

              {/* Sponsors */}
              {event.event_sponsors?.length > 0 && (
                <div className="glass rounded-2xl p-4 border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] font-medium mb-3">Supported by</p>
                  <div className="flex flex-wrap gap-2">
                    {event.event_sponsors.map(s => (
                      <span key={s.id} className="px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text)]">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
