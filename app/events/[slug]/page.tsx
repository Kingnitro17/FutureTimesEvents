'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronDown, Share2, Heart, Navigation } from 'lucide-react';
import TicketClaimForm from '@/components/events/TicketClaimForm';
import QRDisplay from '@/components/tickets/QRDisplay';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { formatEventDate, formatEventTime, formatEventDateTimeRange } from '@/lib/dateUtils';

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
  date: string;
  time: string;
  end_time: string | null;
  doors_open_at: string | null;
  timezone: string;
  starts_at: string; // Computed from date + time for TicketClaimForm compatibility
  venue_name: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  capacity: number;
  attendees: number;
  status: string;
  dress_code: string | null;
  age_guidance: string | null;
  event_rules: string | null;
  organizer_name: string;
  contact_email: string | null;
  ticket_tiers: TicketType[];
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
  const [saved, setSaved] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!slug) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    let query = supabase
      .from('events')
      .select(`
        *,
        ticket_tiers(*)
      `)
      .in('status', ['published', 'sold_out', 'completed']);

    if (isUuid) {
      query = query.eq('id', slug);
    } else {
      query = query.eq('slug', slug);
    }

    const { data, error } = await query.single();

    if (error || !data) { setNotFound(true); setLoading(false); return; }
    
    // Compute starts_at from date + time for TicketClaimForm compatibility
    const eventData = data as unknown as EventData;
    if (eventData.date && eventData.time) {
      eventData.starts_at = `${eventData.date}T${eventData.time}`;
    } else {
      eventData.starts_at = eventData.date || '';
    }
    
    // Ensure attendees has a default value
    if (typeof eventData.attendees !== 'number') {
      eventData.attendees = 0;
    }
    
    setEvent(eventData);
    setLoading(false);
  }, [slug]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  );

  if (notFound || !event) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-5">🔍</div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-3">Event not found</h2>
        <p className="text-[var(--text-muted)] mb-5">This event may have been removed or the link is incorrect.</p>
        <Link href="/events" className="btn btn-md btn-primary">Browse Events</Link>
      </div>
    </div>
  );

  const grad = GRAD_MAP[event.category] ?? GRAD_MAP.lounge;
  const isSoldOut = event.status === 'sold_out';
  const isCompleted = event.status === 'completed';
  const formattedDate = formatEventDate(event.date, event.time);
  const formattedTime = formatEventTime(event.time);
  const formattedEndTime = formatEventTime(event.end_time);
  const dateTimeRange = formatEventDateTimeRange(event.date, event.time, event.end_time);

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-32 sm:pb-8">
      
      {/* Compact header */}
      <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-lg border-b border-[var(--border)] h-14 sm:h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-black text-[var(--text)]">FT</span>
        </Link>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSaved(!saved)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Heart size={20} className={saved ? 'fill-red-500 text-red-500' : 'text-[var(--text)]'} />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors">
            <Share2 size={20} className="text-[var(--text)]" />
          </button>
        </div>
      </header>

      {/* Hero image */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[260px] sm:max-h-[460px] overflow-hidden rounded-[30px] border border-[var(--border)] shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          {/* Desktop: landscape poster, Mobile: original image_url */}
          <picture>
            <source media="(min-width: 640px)" srcSet="https://ecbbmcqwluivbzlaqdsd.supabase.co/storage/v1/object/public/events/events/landscape-poster.png" />
            <img
              src={event.image_url || 'https://ecbbmcqwluivbzlaqdsd.supabase.co/storage/v1/object/public/events/events/landscape-poster.png'}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </picture>
          
          {/* Category badge */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-md"
              style={{ background: 'rgba(0,0,0,0.5)' }}>
              {event.category_label}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 mt-6 sm:mt-8">
        
        {/* Event identity */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--text)] leading-tight mb-2">
            {event.title}
          </h1>
          {event.subtitle && (
            <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
              {event.subtitle}
            </p>
          )}
        </div>

        <div className="mb-8 sm:mb-10 rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)]/80 p-5 sm:p-6 lg:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.06)] backdrop-blur">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]/80">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: grad }}>
              {event.organizer_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'FT'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Hosted by</p>
              <p className="font-semibold text-[var(--text)] truncate">{event.organizer_name || 'Future Times Events'}</p>
            </div>
            <button className="px-4 py-2 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors shrink-0">
              Follow
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--bg-secondary)] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Date</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">{formattedDate}</p>
            </div>
            <div className="rounded-2xl bg-[var(--bg-secondary)] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Time</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">{formattedTime}</p>
            </div>
            <div className="rounded-2xl bg-[var(--bg-secondary)] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Venue</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">{event.venue_name}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)]/80 p-5 sm:p-6 lg:p-8 mb-8 sm:mb-10 shadow-[0_24px_80px_rgba(0,0,0,0.06)] backdrop-blur">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Date</p>
              <p className="mt-2 text-sm sm:text-base font-semibold text-[var(--text)]">{formattedDate}</p>
              {event.doors_open_at && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">Doors open: {formatEventTime(event.doors_open_at)}</p>
              )}
            </div>

            <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Time</p>
              <p className="mt-2 text-sm sm:text-base font-semibold text-[var(--text)]">
                {formattedTime}
                {formattedEndTime && formattedEndTime !== formattedTime && ` – ${formattedEndTime}`}
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{event.timezone || 'Local time'}</p>
            </div>

            <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Venue</p>
              <p className="mt-2 text-sm sm:text-base font-semibold text-[var(--text)]">{event.venue_name}</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{event.address}</p>
              {(event.lat && event.lng) && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text)] hover:underline mt-2 inline-block font-medium">
                  Get directions →
                </a>
              )}
            </div>
          </div>

          {event.capacity > 0 && (
            <div className="mt-4 rounded-2xl bg-[var(--bg-secondary)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Entry</p>
              <p className="mt-2 text-sm sm:text-base font-semibold text-[var(--text)]">Free reservation required</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">Limited to {event.capacity.toLocaleString()} guests</p>
              {isSoldOut && <p className="text-sm text-red-500 font-semibold mt-2">Sold out</p>}
            </div>
          )}
        </div>

        <section className="mb-8 sm:mb-10 rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)]/80 p-5 sm:p-6 lg:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.06)] backdrop-blur">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">About</p>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">About this event</h2>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]">
              {event.category_label}
            </div>
          </div>
          <div className="prose prose-sm sm:prose-base max-w-none">
            <p className="text-[var(--text-secondary)] leading-relaxed text-sm sm:text-base">
              {event.long_description || event.description}
            </p>
          </div>
        </section>

        <section className="mb-8 sm:mb-10 rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)]/80 p-5 sm:p-6 lg:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.06)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Community</p>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mt-1">Who&apos;s going</h2>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]">
              {event.attendees || 0} joined
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[var(--bg-secondary)]/80 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-11 h-11 rounded-full border-2 border-[var(--bg-card)] flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${i * 60}, 70%, 50%), hsl(${i * 60 + 30}, 70%, 40%))` }}
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--text)]">{event.attendees || 0} people are already in</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">Claim your ticket and be part of the vibe.</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {['No-fuss entry', 'Live energy', 'Friends welcome'].map(tag => (
                <span key={tag} className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Spacer */}
        <div className="h-16 sm:h-20" />

        {/* Schedule */}
        {event.event_schedule_items?.length > 0 && (
          <section className="mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4">Event schedule</h2>
            <div className="space-y-3">
              {event.event_schedule_items
                .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
                .map(item => (
                  <div key={item.id} className="flex items-start gap-4 py-3 border-b border-[var(--border)] last:border-0">
                    <div className="text-sm font-mono text-[var(--text-muted)] w-16 shrink-0 pt-0.5">
                      {formatEventTime(item.starts_at)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[var(--text)]">{item.title}</p>
                      {item.performer && <p className="text-sm text-[var(--text-muted)]">{item.performer}</p>}
                      {item.stage && <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">{item.stage}</p>}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Spacer */}
        <div className="h-16 sm:h-20" />

        {/* FAQs */}
        {event.event_faqs?.length > 0 && (
          <section className="mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {event.event_faqs
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(faq => (
                  <div key={faq.id} className="border border-[var(--border)] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
                      className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                      aria-expanded={openFaqId === faq.id}
                    >
                      <p className="font-semibold text-[var(--text)] text-sm sm:text-base">{faq.question}</p>
                      <ChevronDown
                        size={20}
                        className={`text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${openFaqId === faq.id ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {openFaqId === faq.id && (
                      <div className="px-4 pb-4">
                        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Spacer */}
        <div className="h-16 sm:h-20" />

        {/* Venue and map */}
        {(event.venue_name || event.address) && (
          <section className="mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4">Location</h2>
            <div className="space-y-4">
              <div className="glass rounded-2xl p-5 border border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text)] text-lg mb-2">{event.venue_name}</h3>
                <p className="text-[var(--text-secondary)] mb-4">{event.address}</p>
                {(event.lat && event.lng) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text)] hover:bg-[var(--border)] transition-colors"
                  >
                    <Navigation size={16} />
                    Get directions
                  </a>
                )}
              </div>
              
              {/* Embedded map — Google Maps */}
              {(event.lat && event.lng) && (
                <div className="rounded-2xl overflow-hidden border border-[var(--border)] h-64 sm:h-80">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125484.3574096095!2d31.486001194492793!3d-17.279231829121493!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1930270053325827%3A0xde97b4a1ed0d2193!2sLiquid%20Lounge%20Shamva!5e0!3m2!1sen!2szw!4v1784873732849!5m2!1sen!2szw`}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Spacer */}
        <div className="h-16 sm:h-20" />

        {/* Sponsors */}
        {event.event_sponsors?.length > 0 && (
          <section className="mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4">Supported by</h2>
            <div className="flex flex-wrap gap-3">
              {event.event_sponsors.map(s => (
                <span key={s.id} className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text)]">
                  {s.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Desktop ticket sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24 bg-white dark:bg-[#1a1a2e] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-lg max-w-sm ml-auto">
            {isCompleted ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-bold text-gray-900 dark:text-white">Event completed</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Thank you for attending!</p>
              </div>
            ) : isSoldOut ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🔥</div>
                <p className="font-black text-xl text-gray-900 dark:text-white">Sold Out</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All tickets have been claimed.</p>
              </div>
            ) : claimedTicketId && claimedQrToken ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center" style={{ background: grad }}>
                  <span className="text-2xl">🎟️</span>
                </div>
                <h3 className="font-black text-xl text-gray-900 dark:text-white">Your Ticket</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{claimedTicketNumber}</p>
                <div className="flex justify-center">
                  <QRDisplay token={claimedQrToken} size={200} label={`Ticket QR for ${event.title}`} />
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Screenshot or save this QR code. Show it at the entrance.
                </p>
                <Link
                  href={`/ticket/${claimedTicketId}`}
                  className="block w-full py-3 rounded-xl text-center font-bold text-white text-sm transition-all hover:opacity-90"
                  style={{ background: grad }}
                >
                  View Full Ticket →
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Price</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">Free</p>
                </div>
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Date & Time</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{dateTimeRange}</p>
                </div>
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Venue</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{event.venue_name}</p>
                </div>
                <TicketClaimForm
                  event={event}
                  ticketTypes={event.ticket_tiers ?? []}
                  onSuccess={(id, num, token) => {
                    setClaimedTicketId(id);
                    setClaimedTicketNumber(num);
                    setClaimedQrToken(token);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden bg-white dark:bg-[#1a1a2e] border-t border-gray-200 dark:border-white/10 px-5 py-4 sm:py-5" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        {isCompleted ? (
          <div className="text-center py-2">
            <p className="font-semibold text-gray-900 dark:text-white">Event completed</p>
          </div>
        ) : isSoldOut ? (
          <div className="text-center py-2">
            <p className="font-black text-gray-900 dark:text-white">Sold Out</p>
          </div>
        ) : claimedTicketId && claimedQrToken ? (
          <Link
            href={`/ticket/${claimedTicketId}`}
            className="block w-full py-4 sm:py-5 rounded-2xl text-center font-bold text-white text-base sm:text-lg transition-all hover:opacity-90 shadow-lg"
            style={{ background: grad }}
          >
            View Your Ticket
          </Link>
        ) : (
          <Link
            href="#ticket-form"
            className="block w-full py-4 sm:py-5 rounded-2xl text-center font-bold text-white text-base sm:text-lg transition-all hover:opacity-90 shadow-lg"
            style={{ background: grad }}
          >
            Get Free Ticket
          </Link>
        )}
      </div>

      {/* Mobile ticket form (hidden, used for anchor) */}
      <div id="ticket-form" className="lg:hidden mb-8">
        <div className="glass rounded-2xl p-6 border border-[var(--border)]">
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
          ) : claimedTicketId && claimedQrToken ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center" style={{ background: grad }}>
                <span className="text-2xl">🎟️</span>
              </div>
              <h3 className="font-black text-xl text-[var(--text)]">Your Ticket</h3>
              <p className="text-[var(--text-muted)] text-sm">{claimedTicketNumber}</p>
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
            </div>
          ) : (
            <TicketClaimForm
              event={event}
              ticketTypes={event.ticket_tiers ?? []}
              onSuccess={(id, num, token) => {
                setClaimedTicketId(id);
                setClaimedTicketNumber(num);
                setClaimedQrToken(token);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
