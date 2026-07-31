'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MapPin,
  Navigation,
  Share2,
  Ticket,
  Users,
} from 'lucide-react';
import TicketClaimForm, {
  type ClaimableTicketType,
  type TicketClaimReference,
} from '@/components/events/TicketClaimForm';
import WhosGoing from '@/components/events/WhosGoing';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  formatEventDate,
  formatEventDateTimeRange,
  formatEventTime,
} from '@/lib/dateUtils';

interface EventFaq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

interface EventSponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
  sort_order: number;
}

interface EventScheduleItem {
  id: string;
  title: string;
  description: string | null;
  performer: string | null;
  starts_at: string;
  ends_at: string | null;
  stage: string | null;
  sort_order: number;
}

interface EventData {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  long_description: string;
  category: string;
  category_label: string;
  date: string | null;
  time: string | null;
  end_time: string | null;
  starts_at: string;
  doors_open_at: string | null;
  timezone: string;
  venue_name: string;
  venue: string | null;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  landscape_image_url: string | null;
  cover_image_url: string | null;
  capacity: number;
  attendees: number;
  status: string;
  dress_code: string | null;
  age_guidance: string | null;
  event_rules: string | null;
  organizer_name: string;
  contact_email: string | null;
  ticket_types: ClaimableTicketType[];
  event_faqs: EventFaq[];
  event_sponsors: EventSponsor[];
  event_schedule_items: EventScheduleItem[];
}

interface ClaimedTicketReference {
  ticketId: string;
  ticketNumber: string;
}

interface EventFetchResult {
  event: EventData | null;
  relatedDataErrors: string[];
}

class EventLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventLoadError';
  }
}

interface BookingPanelProps {
  event: EventData;
  ticketTypes: ClaimableTicketType[];
  isCompleted: boolean;
  isSoldOut: boolean;
  priceLabel: string;
  availabilityLabel: string;
  dateTimeRange: string;
  claimedTickets: ClaimedTicketReference[];
  claimRequiresQrReissue: boolean;
  onSuccess: (
    tickets: TicketClaimReference[],
    options: { requiresQrReissue: boolean; ticketTypeId?: string },
  ) => void;
}

const GRAD_MAP: Record<string, string> = {
  music: 'var(--grad-primary)',
  tech: 'var(--grad-electric)',
  art: 'var(--grad-cosmic)',
  food: 'var(--grad-fire)',
  wellness: 'var(--grad-emerald)',
  sports: 'var(--grad-ocean)',
  lounge: 'var(--grad-primary)',
};

function formatPrice(value: number): string {
  if (value === 0) return 'Free';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTimeValue(value?: string | null): string {
  if (!value) return 'Time to be announced';

  if (!value.includes('T')) {
    return formatEventTime(value);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Time to be announced';

  return new Intl.DateTimeFormat('en-ZW', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Harare',
  }).format(parsed);
}

function renderFormattedEventDescription(text: string) {
  if (!text) return null;

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const elements: React.ReactNode[] = [];
  let bulletGroup: string[] = [];

  const flushBullets = (keyPrefix: string) => {
    if (bulletGroup.length > 0) {
      elements.push(
        <ul
          key={`${keyPrefix}-ul`}
          className="mt-2 mb-4 space-y-2 pl-5 list-disc text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]"
        >
          {bulletGroup.map((bullet, idx) => (
            <li key={`${keyPrefix}-li-${idx}`}>{bullet}</li>
          ))}
        </ul>,
      );
      bulletGroup = [];
    }
  };

  lines.forEach((line, idx) => {
    if (/^[-*•]\s+/.test(line)) {
      bulletGroup.push(line.replace(/^[-*•]\s+/, ''));
      return;
    }

    flushBullets(`bullets-${idx}`);

    const boldHeadingMatch = line.match(/^\*\*(.+?)\*\*:?$/);
    if (boldHeadingMatch) {
      const headingText = boldHeadingMatch[1].trim();
      elements.push(
        <h3
          key={`h3-${idx}`}
          className="mt-5 mb-2 font-bold text-base sm:text-lg text-[var(--text)] tracking-tight"
        >
          {headingText}
        </h3>,
      );
      return;
    }

    const cleanedLine = line.replace(/\*\*(.*?)\*\*/g, '$1');
    elements.push(
      <p
        key={`p-${idx}`}
        className="mt-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]"
      >
        {cleanedLine}
      </p>,
    );
  });

  flushBullets('final-bullets');

  return <div className="space-y-1">{elements}</div>;
}

function normalizeTicketType(ticketType: ClaimableTicketType): ClaimableTicketType {
  return {
    ...ticketType,
    description: ticketType.description ?? null,
    price: Number(ticketType.price) || 0,
    quantity_available: Math.max(0, Number(ticketType.quantity_available) || 0),
    claim_limit_per_contact: Math.max(
      1,
      Number(ticketType.claim_limit_per_contact) || 1,
    ),
    claim_opens_at: ticketType.claim_opens_at ?? null,
    claim_closes_at: ticketType.claim_closes_at ?? null,
    is_active: ticketType.is_active !== false,
    is_visible: ticketType.is_visible !== false,
    sort_order: Number(ticketType.sort_order) || 0,
  };
}

function normalizeEventData(value: unknown): EventData | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Partial<EventData>;
  if (!raw.id || !raw.title) return null;

  const venueName = raw.venue_name?.trim()
    || raw.venue?.trim()
    || 'Venue to be announced';
  const date = raw.date ?? (raw.starts_at ? raw.starts_at.slice(0, 10) : null);
  const time = raw.time ?? null;
  const startsAt = raw.starts_at
    || (date ? `${date}T${time || '00:00:00'}` : '');

  const ticketTypes = Array.isArray(raw.ticket_types)
    ? raw.ticket_types.map(normalizeTicketType).sort(
      (first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0),
    )
    : [];

  return {
    id: raw.id,
    title: raw.title,
    subtitle: raw.subtitle ?? null,
    description: raw.description ?? '',
    long_description: raw.long_description ?? '',
    category: raw.category ?? 'lounge',
    category_label: raw.category_label ?? raw.category ?? 'Event',
    date,
    time,
    end_time: raw.end_time ?? null,
    starts_at: startsAt,
    doors_open_at: raw.doors_open_at ?? null,
    timezone: raw.timezone ?? 'Africa/Harare',
    venue_name: venueName,
    venue: raw.venue ?? null,
    address: raw.address ?? '',
    city: raw.city ?? '',
    lat: normalizeCoordinate(raw.lat),
    lng: normalizeCoordinate(raw.lng),
    image_url: raw.image_url ?? null,
    landscape_image_url: raw.landscape_image_url ?? null,
    cover_image_url: raw.cover_image_url ?? null,
    capacity: Math.max(0, Number(raw.capacity) || 0),
    attendees: Math.max(0, Number(raw.attendees) || 0),
    status: raw.status ?? 'published',
    dress_code: raw.dress_code ?? null,
    age_guidance: raw.age_guidance ?? null,
    event_rules: raw.event_rules ?? null,
    organizer_name: raw.organizer_name?.trim() || 'Future Times Events',
    contact_email: raw.contact_email ?? null,
    ticket_types: ticketTypes,
    event_faqs: Array.isArray(raw.event_faqs) ? raw.event_faqs : [],
    event_sponsors: Array.isArray(raw.event_sponsors) ? raw.event_sponsors : [],
    event_schedule_items: Array.isArray(raw.event_schedule_items)
      ? raw.event_schedule_items
      : [],
  };
}

async function fetchEvent(slug: string): Promise<EventFetchResult> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const supabase = getSupabaseBrowserClient();

  let query = supabase
    .from('events')
    .select('*')
    .in('status', ['published', 'sold_out', 'completed', 'postponed']);

  query = isUuid ? query.eq('id', slug) : query.eq('slug', slug);

  const { data: eventRow, error: eventError } = await query.maybeSingle();
  if (eventError) {
    throw new EventLoadError(eventError.message);
  }
  if (!eventRow) {
    return { event: null, relatedDataErrors: [] };
  }

  const [
    ticketTypesResult,
    faqsResult,
    sponsorsResult,
    scheduleResult,
  ] = await Promise.all([
    supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', eventRow.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('event_faqs')
      .select('*')
      .eq('event_id', eventRow.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('event_sponsors')
      .select('*')
      .eq('event_id', eventRow.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('event_schedule_items')
      .select('*')
      .eq('event_id', eventRow.id)
      .order('sort_order', { ascending: true }),
  ]);

  const relatedDataErrors = [
    ticketTypesResult.error ? 'ticket availability' : null,
    faqsResult.error ? 'frequently asked questions' : null,
    sponsorsResult.error ? 'event partners' : null,
    scheduleResult.error ? 'event schedule' : null,
  ].filter((label): label is string => Boolean(label));

  const event = normalizeEventData({
    ...eventRow,
    ticket_types: ticketTypesResult.data ?? [],
    event_faqs: faqsResult.data ?? [],
    event_sponsors: sponsorsResult.data ?? [],
    event_schedule_items: scheduleResult.data ?? [],
  });

  if (!event) {
    throw new EventLoadError('The event response was incomplete.');
  }

  return { event, relatedDataErrors };
}

function BookingPanel({
  event,
  ticketTypes,
  isCompleted,
  isSoldOut,
  priceLabel,
  availabilityLabel,
  dateTimeRange,
  claimedTickets,
  claimRequiresQrReissue,
  onSuccess,
}: BookingPanelProps) {
  return (
    <div className="rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] p-[var(--sp-4)] shadow-[var(--shadow-card)] sm:p-[var(--sp-5)]">
      {isCompleted ? (
        <div className="py-6 text-center" role="status">
          <CheckCircle2
            className="mx-auto text-[var(--accent)]"
            size={36}
            aria-hidden="true"
          />
          <h2 className="mt-3 text-xl font-bold text-[var(--text)]">
            Event completed
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Ticket reservations are closed.
          </p>
        </div>
      ) : isSoldOut ? (
        <div className="py-6 text-center" role="status">
          <Ticket
            className="mx-auto text-[var(--text-muted)]"
            size={36}
            aria-hidden="true"
          />
          <h2 className="mt-3 text-xl font-bold text-[var(--text)]">
            No tickets available
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            This event is sold out or reservations are not currently available.
          </p>
        </div>
      ) : claimedTickets.length > 0 ? (
        <div className="space-y-5" role="status" aria-live="polite">
          <div className="text-center">
            <CheckCircle2
              className="mx-auto text-emerald-500"
              size={36}
              aria-hidden="true"
            />
            <h2 className="mt-3 text-xl font-bold text-[var(--text)]">
              {claimedTickets.length}{' '}
              {claimRequiresQrReissue
                ? (claimedTickets.length === 1
                    ? 'ticket was already reserved'
                    : 'tickets were already reserved')
                : (claimedTickets.length === 1 ? 'ticket is ready' : 'tickets are ready')}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {claimRequiresQrReissue
                ? 'Sign in with the booking email and recover the secure QR codes from your wallet.'
                : 'Open each ticket to view its unique QR code.'}
            </p>
          </div>
          {claimRequiresQrReissue ? (
            <Link href="/tickets" className="btn btn-lg btn-primary w-full">
              Open secure ticket wallet
            </Link>
          ) : (
            <ul className="space-y-2">
              {claimedTickets.map((ticket) => (
                <li key={ticket.ticketId}>
                  <Link
                    href={`/ticket/${ticket.ticketId}`}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-semibold text-[var(--text)] hover:border-[var(--border-hover)]"
                  >
                    <span className="truncate">{ticket.ticketNumber}</span>
                    <span className="shrink-0 text-sm text-[var(--accent)]">
                      View
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="event-details-grid">
            <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-[var(--sp-3)]">
              <p className="type-overline text-[var(--text-muted)]">Price</p>
              <p className="mt-1 font-black text-[var(--text)]">{priceLabel}</p>
            </div>
            <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-[var(--sp-3)]">
              <p className="type-overline text-[var(--text-muted)]">
                Availability
              </p>
              <p className="mt-1 font-black text-[var(--text)]">
                {availabilityLabel}
              </p>
            </div>
            <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-[var(--sp-3)]" style={{ gridColumn: '1 / -1' }}>
              <p className="type-overline text-[var(--text-muted)]">When</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {dateTimeRange}
              </p>
            </div>
          </div>
          <TicketClaimForm
            event={event}
            ticketTypes={ticketTypes}
            onSuccess={onSuccess}
          />
        </>
      )}
    </div>
  );
}

export default function EventSlugPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [relatedDataErrors, setRelatedDataErrors] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState('');
  const [claimedTickets, setClaimedTickets] = useState<ClaimedTicketReference[]>([]);
  const [claimRequiresQrReissue, setClaimRequiresQrReissue] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let ignore = false;

    async function fetchData() {
      setLoading(true);
      setNotFound(false);
      setLoadError(null);
      setRelatedDataErrors([]);

      try {
        const { event: loadedEvent, relatedDataErrors: relatedErrors } = await fetchEvent(slug);
        if (ignore) return;

        if (!loadedEvent) {
          setEvent(null);
          setNotFound(true);
        } else {
          setClaimedTickets([]);
          setClaimRequiresQrReissue(false);
          setNotFound(false);
          setRelatedDataErrors(relatedErrors);
          setEvent(loadedEvent);
        }
      } catch (error: unknown) {
        if (ignore) return;
        console.error('[Event detail] load failed:', error);
        setEvent(null);
        setNotFound(false);
        setLoadError('We could not load this event right now. Check your connection and try again.');
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      ignore = true;
    };
  }, [slug, reloadKey]);

  if (loading) {
    return (
      <div
        className="page-offset flex min-h-screen items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3" role="status">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading event…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-offset flex min-h-screen items-center justify-center px-4">
        <div
          className="w-full max-w-md rounded-[var(--r-3xl)] border border-amber-500/30 bg-[var(--bg-card)] p-6 text-center shadow-[var(--shadow-card)] sm:p-8"
          role="alert"
        >
          <Ticket
            className="mx-auto text-amber-500"
            size={44}
            aria-hidden="true"
          />
          <p className="mt-4 type-overline text-amber-500">Temporary issue</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--text)]">
            Event details are unavailable
          </h1>
          <p className="mt-3 text-[var(--text-muted)]">{loadError}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="btn btn-md btn-primary flex-1"
            >
              Try again
            </button>
            <Link href="/events" className="btn btn-md btn-outline flex-1">
              Browse events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div
        className="page-offset flex min-h-screen items-center justify-center px-4"
      >
        <div className="max-w-md rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-card)]">
          <Ticket
            className="mx-auto text-[var(--text-muted)]"
            size={44}
            aria-hidden="true"
          />
          <h1 className="mt-4 text-2xl font-bold text-[var(--text)]">
            Event not found
          </h1>
          <p className="mt-3 text-[var(--text-muted)]">
            This event may have been removed or the link is incorrect.
          </p>
          <Link href="/events" className="btn btn-md btn-primary mt-6">
            Browse events
          </Link>
        </div>
      </div>
    );
  }

  const visibleTicketTypes = event.ticket_types.filter(
    (ticketType) => ticketType.is_active && ticketType.is_visible !== false,
  );
  const availableTicketTypes = visibleTicketTypes.filter(
    (ticketType) => ticketType.quantity_available > 0,
  );
  const availableTicketCount = availableTicketTypes.reduce(
    (total, ticketType) => total + ticketType.quantity_available,
    0,
  );
  const availablePrices = availableTicketTypes.map(
    (ticketType) => ticketType.price,
  );
  const minPrice = availablePrices.length > 0
    ? Math.min(...availablePrices)
    : 0;
  const maxPrice = availablePrices.length > 0
    ? Math.max(...availablePrices)
    : 0;
  const priceLabel = availablePrices.length === 0
    ? 'Unavailable'
    : minPrice === 0 && maxPrice > 0
      ? 'Free & paid'
      : minPrice === maxPrice
        ? formatPrice(minPrice)
        : `From ${formatPrice(minPrice)}`;
  const availabilityLabel = availableTicketCount === 1
    ? '1 ticket left'
    : `${availableTicketCount} tickets left`;
  const isCompleted = event.status === 'completed';
  const isSoldOut = event.status !== 'published'
    || visibleTicketTypes.length === 0
    || availableTicketTypes.length === 0;
  const formattedDate = formatEventDate(event.date, event.time);
  const formattedTime = formatEventTime(event.time);
  const formattedEndTime = event.end_time
    ? formatEventTime(event.end_time)
    : null;
  const dateTimeRange = formatEventDateTimeRange(
    event.date,
    event.time,
    event.end_time,
  );
  const gradient = GRAD_MAP[event.category] ?? GRAD_MAP.lounge;
  const mobileHeroImage = event.image_url
    || event.cover_image_url
    || event.landscape_image_url;
  const desktopHeroImage = event.landscape_image_url
    || event.cover_image_url
    || event.image_url;
  const hasCoordinates = event.lat !== null && event.lng !== null;
  const locationQuery = hasCoordinates
    ? `${event.lat},${event.lng}`
    : [event.venue_name, event.address, event.city].filter(Boolean).join(', ');
  const directionsUrl = locationQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`
    : null;
  const mapEmbedUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${event.lat},${event.lng}`)}&z=15&output=embed`
    : null;
  const sortedSchedule = [...event.event_schedule_items].sort(
    (first, second) => {
      if (first.sort_order !== second.sort_order) {
        return first.sort_order - second.sort_order;
      }
      return new Date(first.starts_at).getTime()
        - new Date(second.starts_at).getTime();
    },
  );
  const sortedFaqs = [...event.event_faqs].sort(
    (first, second) => first.sort_order - second.sort_order,
  );
  const sortedSponsors = [...event.event_sponsors].sort(
    (first, second) => first.sort_order - second.sort_order,
  );
  const goodToKnow = [
    event.doors_open_at
      ? { label: 'Doors open', value: formatTimeValue(event.doors_open_at) }
      : null,
    event.dress_code
      ? { label: 'Dress code', value: event.dress_code }
      : null,
    event.age_guidance
      ? { label: 'Age guidance', value: event.age_guidance }
      : null,
    event.event_rules
      ? { label: 'Entry rules', value: event.event_rules }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  const handleClaimSuccess = (
    tickets: TicketClaimReference[],
    options: { requiresQrReissue: boolean; ticketTypeId?: string },
  ) => {
    setClaimedTickets(
      tickets.map(({ ticketId, ticketNumber }) => ({
        ticketId,
        ticketNumber,
      })),
    );
    setClaimRequiresQrReissue(options.requiresQrReissue);

    if (!options.requiresQrReissue) {
      setEvent(current => {
        if (!current) return current;
        return {
          ...current,
          attendees: current.attendees + tickets.length,
          ticket_types: current.ticket_types.map(ticketType => (
            ticketType.id === options.ticketTypeId
              ? {
                  ...ticketType,
                  quantity_available: Math.max(
                    ticketType.quantity_available - tickets.length,
                    0,
                  ),
                }
              : ticketType
          )),
        };
      });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: event.subtitle || `View ${event.title} on Future Times Events`,
      url: window.location.href,
    };

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData);
        setShareStatus('Shared');
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        setShareStatus('Link copied');
        return;
      }

      setShareStatus('Copy this page URL from your browser');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('Could not share this event');
    }
  };

  return (
    <div className="page-offset relative min-h-screen overflow-x-clip bg-[var(--bg)] pb-action-bar lg:pb-16">
      {desktopHeroImage && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[min(76vh,760px)] overflow-hidden"
          aria-hidden="true"
        >
          <Image
            src={desktopHeroImage}
            alt=""
            fill
            sizes="100vw"
            className="scale-110 object-cover opacity-50 blur-3xl saturate-125"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(900px 520px at 82% 18%, rgba(114,34,227,0.22), transparent 58%), linear-gradient(180deg, rgba(0,0,0,0.20) 0%, var(--bg) 96%)',
            }}
          />
        </div>
      )}

      <article className="relative z-10">
        <div className="container pt-4 sm:pt-6">
          <div className="relative aspect-[4/5] max-h-[680px] overflow-hidden rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow-lg)] sm:aspect-[16/9] lg:aspect-[21/9] lg:max-h-[500px]">
            {mobileHeroImage && desktopHeroImage ? (
              <>
                <Image
                  src={mobileHeroImage}
                  alt={`${event.title} event artwork`}
                  fill
                  sizes="(max-width: 639px) calc(100vw - 32px), 1px"
                  className="object-cover sm:hidden"
                  fetchPriority="high"
                />
                <Image
                  src={desktopHeroImage}
                  alt={`${event.title} event artwork`}
                  fill
                  sizes="(min-width: 1280px) 1216px, (min-width: 640px) calc(100vw - 48px), 1px"
                  className="hidden object-cover sm:block"
                  fetchPriority="high"
                />
              </>
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: gradient }}
                aria-hidden="true"
              />
            )}

            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.36) 0%, transparent 42%, rgba(0,0,0,0.66) 100%)',
              }}
              aria-hidden="true"
            />

            <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3 sm:inset-x-6 sm:top-6">
              <Link
                href="/events"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 py-2 text-sm font-semibold text-white backdrop-blur-xl hover:bg-black/70"
                aria-label="Back to all events"
              >
                <ArrowLeft size={17} aria-hidden="true" />
                <span className="hidden sm:inline">All events</span>
              </Link>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 py-2 text-sm font-semibold text-white backdrop-blur-xl hover:bg-black/70"
                aria-label="Share this event"
              >
                <Share2 size={17} aria-hidden="true" />
                <span>
                  {shareStatus === 'Link copied'
                    ? 'Copied'
                    : shareStatus === 'Shared'
                      ? 'Shared'
                      : 'Share'}
                </span>
              </button>
            </div>

            <div className="absolute bottom-4 left-4 z-10 sm:bottom-6 sm:left-6">
              <span className="rounded-full border border-white/20 bg-black/55 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur-xl">
                {event.category_label}
              </span>
            </div>
            <span className="sr-only" aria-live="polite">{shareStatus}</span>
          </div>

          <header
            className="mt-4 rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] sm:mt-6"
            style={{
              padding: 'clamp(1.25rem, 4vw, 2.5rem)',
              boxSizing: 'border-box',
            }}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {event.status === 'postponed' && (
                    <span className="badge badge-warn">Postponed</span>
                  )}
                  {isCompleted && (
                    <span className="badge badge-info">Completed</span>
                  )}
                  {isSoldOut && !isCompleted && (
                    <span className="badge badge-error">No tickets available</span>
                  )}
                </div>
                <h1
                  className="font-bold leading-tight text-[var(--text)]"
                  style={{ fontSize: 'clamp(1.375rem, 3.5vw + 0.9rem, 3rem)' }}
                >
                  {event.title}
                </h1>
                {event.subtitle && (
                  <p
                    className="mt-4 max-w-3xl rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)] text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg"
                    style={{
                      padding: 'clamp(1rem, 2.8vw, 1.25rem)',
                      boxSizing: 'border-box',
                    }}
                  >
                    {event.subtitle}
                  </p>
                )}
              </div>

              <div
                className="flex items-center gap-3.5 rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)] min-w-0"
                style={{
                  padding: 'clamp(0.875rem, 2.5vw, 1.25rem)',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                  style={{ background: gradient }}
                  aria-hidden="true"
                >
                  {event.organizer_name
                    .split(' ')
                    .map((word) => word[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="type-overline text-[var(--text-muted)]">Hosted by</p>
                  <p className="mt-1 truncate font-semibold text-[var(--text)]">
                    {event.organizer_name}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {relatedDataErrors.length > 0 && (
            <div
              className="mt-4 rounded-[var(--r-xl)] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-[var(--text-secondary)] sm:mt-6"
              role="status"
            >
              Some sections are temporarily unavailable: {relatedDataErrors.join(', ')}.
              The main event information is still available.
            </div>
          )}

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
            <div className="min-w-0 space-y-6">
              <WhosGoing eventId={event.id} />

              <section
                className="rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]"
                aria-labelledby="event-details-heading"
                style={{
                  padding: 'clamp(1.25rem, 4vw, 2.5rem)',
                  boxSizing: 'border-box',
                }}
              >
                <p className="type-overline text-[var(--text-muted)]">Plan your visit</p>
                <h2 id="event-details-heading" className="mt-1 text-2xl font-bold text-[var(--text)]">
                  Event details
                </h2>

                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div
                    className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
                    style={{
                      padding: 'clamp(1rem, 2.8vw, 1.375rem)',
                      boxSizing: 'border-box',
                      minWidth: 0,
                    }}
                  >
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      <CalendarDays size={16} aria-hidden="true" />
                      Date
                    </dt>
                    <dd className="mt-2 font-semibold text-[var(--text)]">
                      {formattedDate}
                    </dd>
                  </div>
                  <div
                    className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
                    style={{
                      padding: 'clamp(1rem, 2.8vw, 1.375rem)',
                      boxSizing: 'border-box',
                      minWidth: 0,
                    }}
                  >
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      <Clock3 size={16} aria-hidden="true" />
                      Time
                    </dt>
                    <dd className="mt-2 font-semibold text-[var(--text)]">
                      {formattedTime}
                      {formattedEndTime
                        && formattedEndTime !== formattedTime
                        && ` – ${formattedEndTime}`}
                    </dd>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {event.timezone}
                    </p>
                  </div>
                  <div
                    className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)] sm:col-span-2"
                    style={{
                      padding: 'clamp(1rem, 2.8vw, 1.375rem)',
                      boxSizing: 'border-box',
                      minWidth: 0,
                    }}
                  >
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      <MapPin size={16} aria-hidden="true" />
                      Venue
                    </dt>
                    <dd className="mt-2 font-semibold text-[var(--text)]">
                      {event.venue_name}
                    </dd>
                    {(event.address || event.city) && (
                      <p className="mt-1.5 text-sm text-[var(--text-muted)] leading-relaxed">
                        {[event.address, event.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline mt-4 w-full sm:w-auto"
                      >
                        <Navigation size={15} aria-hidden="true" />
                        Get directions
                      </a>
                    )}
                  </div>
                  <div
                    className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
                    style={{
                      padding: 'clamp(1rem, 2.8vw, 1.375rem)',
                      boxSizing: 'border-box',
                      minWidth: 0,
                    }}
                  >
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      <Ticket size={16} aria-hidden="true" />
                      Tickets
                    </dt>
                    <dd className="mt-2 font-semibold text-[var(--text)]">
                      {priceLabel}
                    </dd>
                    {!isCompleted && !isSoldOut && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {availabilityLabel}
                      </p>
                    )}
                  </div>
                  <div
                    className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
                    style={{
                      padding: 'clamp(1rem, 2.8vw, 1.375rem)',
                      boxSizing: 'border-box',
                      minWidth: 0,
                    }}
                  >
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      <Users size={16} aria-hidden="true" />
                      Attendance
                    </dt>
                    <dd className="mt-2 font-semibold text-[var(--text)]">
                      {event.attendees.toLocaleString()} claimed
                    </dd>
                    {event.capacity > 0 && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Capacity {event.capacity.toLocaleString()}
                      </p>
                    )}
                  </div>
                </dl>
              </section>

              <div
                id="ticket-form"
                className="scroll-mt-[calc(var(--nav-h)+16px)] lg:hidden"
              >
                <BookingPanel
                  event={event}
                  ticketTypes={visibleTicketTypes}
                  isCompleted={isCompleted}
                  isSoldOut={isSoldOut}
                  priceLabel={priceLabel}
                  availabilityLabel={availabilityLabel}
                  dateTimeRange={dateTimeRange}
                  claimedTickets={claimedTickets}
                  claimRequiresQrReissue={claimRequiresQrReissue}
                  onSuccess={handleClaimSuccess}
                />
              </div>

              <section
                className="rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]"
                aria-labelledby="about-event-heading"
                style={{
                  padding: 'clamp(1.25rem, 4vw, 2.5rem)',
                  boxSizing: 'border-box',
                }}
              >
                <p className="type-overline text-[var(--text-muted)]">About</p>
                <h2 id="about-event-heading" className="mt-1 text-2xl font-bold text-[var(--text)]">
                  About this event
                </h2>
                <div
                  className="mt-4 rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
                  style={{
                    padding: 'clamp(1rem, 3vw, 1.5rem)',
                    boxSizing: 'border-box',
                  }}
                >
                  {renderFormattedEventDescription(
                    event.long_description || event.description || 'More event details will be announced soon.'
                  )}
                </div>

                {goodToKnow.length > 0 && (
                  <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                    {goodToKnow.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
                        style={{
                          padding: 'clamp(1rem, 2.8vw, 1.375rem)',
                          boxSizing: 'border-box',
                          minWidth: 0,
                        }}
                      >
                        <dt className="type-overline text-[var(--text-muted)]">
                          {item.label}
                        </dt>
                        <dd className="mt-2 text-sm font-semibold leading-relaxed text-[var(--text)]">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              {sortedSchedule.length > 0 && (
                <section
                  className="rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]"
                  aria-labelledby="event-schedule-heading"
                  style={{
                    padding: 'clamp(1.25rem, 4vw, 2.5rem)',
                    boxSizing: 'border-box',
                  }}
                >
                  <p className="type-overline text-[var(--text-muted)]">Programme</p>
                  <h2 id="event-schedule-heading" className="mt-1 text-2xl font-bold text-[var(--text)]">
                    Event schedule
                  </h2>
                  <ol className="mt-5 space-y-4">
                    {sortedSchedule.map((item) => (
                      <li
                        key={item.id}
                        className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
                        style={{
                          padding: 'clamp(1rem, 2.8vw, 1.375rem)',
                          boxSizing: 'border-box',
                          minWidth: 0,
                        }}
                      >
                        <time
                          dateTime={item.starts_at}
                          className="text-sm font-bold text-[var(--accent)]"
                        >
                          {formatTimeValue(item.starts_at)}
                        </time>
                        <div>
                          <p className="font-semibold text-[var(--text)]">{item.title}</p>
                          {item.performer && (
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                              {item.performer}
                            </p>
                          )}
                          {item.description && (
                            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                              {item.description}
                            </p>
                          )}
                          {item.stage && (
                            <span className="badge badge-info mt-2">{item.stage}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {(event.address || hasCoordinates) && (
                <section
                  className="overflow-hidden rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]"
                  aria-labelledby="event-location-heading"
                >
                  <div
                    style={{
                      padding: 'clamp(1.25rem, 4vw, 2.5rem)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <p className="type-overline text-[var(--text-muted)]">Location</p>
                    <h2 id="event-location-heading" className="mt-1 text-2xl font-bold text-[var(--text)]">
                      {event.venue_name}
                    </h2>
                    {(event.address || event.city) && (
                      <p className="mt-3 text-[var(--text-secondary)] leading-relaxed">
                        {[event.address, event.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-md btn-outline mt-5 w-full sm:w-auto"
                      >
                        <Navigation size={16} aria-hidden="true" />
                        Open directions
                      </a>
                    )}
                  </div>
                  {mapEmbedUrl && (
                    <div className="h-64 border-t border-[var(--border)] sm:h-80">
                      <iframe
                        title={`Map showing ${event.venue_name}`}
                        src={mapEmbedUrl}
                        className="h-full w-full"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>
                  )}
                </section>
              )}

              {sortedFaqs.length > 0 && (
                <section
                  className="rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] p-[var(--sp-4)] shadow-[var(--shadow-card)] sm:p-[var(--sp-5)]"
                  aria-labelledby="event-faq-heading"
                >
                  <p className="type-overline text-[var(--text-muted)]">Need to know</p>
                  <h2 id="event-faq-heading" className="mt-1 text-2xl font-bold text-[var(--text)]">
                    Frequently asked questions
                  </h2>
                  <div className="mt-5 space-y-2">
                    {sortedFaqs.map((faq) => {
                      const isOpen = openFaqId === faq.id;
                      const answerId = `faq-answer-${faq.id}`;

                      return (
                        <div
                          key={faq.id}
                          className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                            className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-[var(--bg-tertiary)]"
                            aria-expanded={isOpen}
                            aria-controls={answerId}
                          >
                            <span className="font-semibold text-[var(--text)]">
                              {faq.question}
                            </span>
                            <ChevronDown
                              size={20}
                              className={`shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                          {isOpen && (
                            <div id={answerId} className="px-4 pb-4">
                              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                                {faq.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {sortedSponsors.length > 0 && (
                <section
                  className="rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--bg-card)] p-[var(--sp-4)] shadow-[var(--shadow-card)] sm:p-[var(--sp-5)]"
                  aria-labelledby="event-sponsors-heading"
                >
                  <p className="type-overline text-[var(--text-muted)]">Partners</p>
                  <h2 id="event-sponsors-heading" className="mt-1 text-2xl font-bold text-[var(--text)]">
                    Supported by
                  </h2>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {sortedSponsors.map((sponsor) => (
                      <li key={sponsor.id}>
                        {sponsor.website_url ? (
                          <a
                            href={sponsor.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:border-[var(--border-hover)]"
                          >
                            {sponsor.name}
                          </a>
                        ) : (
                          <span className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--text)]">
                            {sponsor.name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside
              className="sticky top-[calc(var(--nav-h)+24px)] hidden lg:block"
              aria-label="Ticket reservation"
            >
              <BookingPanel
                event={event}
                ticketTypes={visibleTicketTypes}
                isCompleted={isCompleted}
                isSoldOut={isSoldOut}
                priceLabel={priceLabel}
                availabilityLabel={availabilityLabel}
                dateTimeRange={dateTimeRange}
                claimedTickets={claimedTickets}
                claimRequiresQrReissue={claimRequiresQrReissue}
                onSuccess={handleClaimSuccess}
              />
            </aside>
          </div>
        </div>
      </article>

      <div
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--border)] bg-[var(--bg-card)]/95 px-4 pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.10)] backdrop-blur-xl lg:hidden"
        style={{
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'calc(1rem + env(safe-area-inset-left, 0px))',
          paddingRight: 'calc(1rem + env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="mx-auto max-w-2xl">
          {isCompleted ? (
            <div className="flex min-h-12 items-center justify-center rounded-[var(--r-xl)] bg-[var(--bg-secondary)] font-semibold text-[var(--text-muted)]">
              Event completed
            </div>
          ) : isSoldOut ? (
            <div className="flex min-h-12 items-center justify-center rounded-[var(--r-xl)] bg-[var(--bg-secondary)] font-semibold text-[var(--text-muted)]">
              No tickets available
            </div>
          ) : (
            <Link
              href={claimRequiresQrReissue ? '/tickets' : '#ticket-form'}
              className="btn btn-lg btn-primary w-full"
            >
              <Ticket size={18} aria-hidden="true" />
              {claimRequiresQrReissue
                ? 'Open secure ticket wallet'
                : claimedTickets.length > 0
                ? `View ${claimedTickets.length} ${claimedTickets.length === 1 ? 'ticket' : 'tickets'}`
                : 'Choose tickets'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
