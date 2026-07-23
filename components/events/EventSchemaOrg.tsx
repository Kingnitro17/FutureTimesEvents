/**
 * EventSchemaOrg — injects schema.org/Event JSON-LD structured data.
 *
 * Place this inside any event detail page's <head> or at the top of the
 * page component. Next.js renders <script> tags server-side, so crawlers
 * see the markup without JavaScript.
 *
 * Spec: https://schema.org/Event
 * Google rich result: https://developers.google.com/search/docs/appearance/structured-data/event
 */

import type { Event } from '@/types';

interface Props {
  event: Event;
  /** Canonical URL for this event page */
  url?: string;
}

export default function EventSchemaOrg({ event, url }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.longDescription || event.description || '',
    startDate: event.dateISO && event.time
      ? `${event.dateISO}T${to24h(event.time)}`
      : event.dateISO,
    endDate: event.dateISO && event.endTime
      ? `${event.dateISO}T${to24h(event.endTime)}`
      : undefined,
    image: event.images?.length > 0 ? event.images : event.image ? [event.image] : undefined,
    url: url ?? (typeof window !== 'undefined' ? window.location.href : undefined),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address  || event.venue,
        addressLocality: event.city  || '',
        addressCountry: 'ZW',
      },
      ...(event.lat && event.lng
        ? { geo: { '@type': 'GeoCoordinates', latitude: event.lat, longitude: event.lng } }
        : {}),
    },
    organizer: event.organizer
      ? { '@type': 'Organization', name: event.organizer }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: event.price === 0 ? '0' : String(event.price),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      validFrom: event.dateISO,
      url: url ?? undefined,
    },
    performer: event.lineup?.length > 0
      ? event.lineup.map(name => ({ '@type': 'PerformingGroup', name }))
      : undefined,
    keywords: event.tags?.join(', '),
    typicalAgeRange: '18+',
  };

  // Remove undefined keys for clean JSON
  const clean = JSON.parse(JSON.stringify(schema));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean) }}
    />
  );
}

/** Convert '7:30 PM' → '19:30:00' for ISO 8601 */
function to24h(timeStr: string): string {
  try {
    const [time, period] = timeStr.split(' ');
    const [h, m] = time.split(':').map(Number);
    let hour = h;
    if (period === 'PM' && h !== 12) hour += 12;
    if (period === 'AM' && h === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  } catch {
    return '00:00:00';
  }
}
