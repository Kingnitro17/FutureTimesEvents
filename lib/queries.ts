import { supabase } from './supabase';
import { MOCK_EVENTS, MOCK_TICKETS, GRADIENT_STYLES, EVENT_IMAGES } from './mockData';
import type { Event, TicketTier, Ticket } from '@/types';

const GRAD_MAP: Record<string, string> = {
  music:     'linear-gradient(135deg,#FF55C2,#7222E3)',
  tech:      'linear-gradient(135deg,#1D5BFF,#C7FE17)',
  art:       'linear-gradient(135deg,#DD1FFF,#24D8FB)',
  food:      'linear-gradient(135deg,#FFBC73,#FF00B9)',
  wellness:  'linear-gradient(135deg,#46FFAB,#A02EFF)',
  sports:    'linear-gradient(135deg,#2CC4EA,#533885)',
  nightlife: 'linear-gradient(135deg,#7222E3,#4F46E5)',
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  } catch { return timeStr; }
}

export function transformEvent(row: any): Event {
  const tiers: TicketTier[] = (row.ticket_tiers || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    price: parseFloat(t.price) || 0,
    description: t.description || '',
    perks: t.perks || [],
    available: t.available || 0,
    total: t.total || 0,
    gradient: t.gradient || GRAD_MAP[row.category] || GRADIENT_STYLES[0],
  }));

  const price = parseFloat(row.price) || 0;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    categoryLabel: row.category_label,
    date: formatDate(row.date),
    dateISO: row.date,
    time: formatTime(row.time),
    endTime: formatTime(row.end_time),
    venue: row.venue,
    address: row.address || '',
    city: row.city || '',
    description: row.description || '',
    longDescription: row.long_description || '',
    price,
    priceLabel: price === 0 ? 'Free' : `$${price}`,
    attendees: row.attendees || 0,
    capacity: row.capacity || 100,
    image: row.image_url || EVENT_IMAGES[0],
    images: row.image_url ? [row.image_url] : [EVENT_IMAGES[0]],
    mood: row.mood || 'social',
    tags: row.tags || [],
    featured: row.featured || false,
    lineup: row.lineup || [],
    organizer: row.organizer_name || 'Organizer',
    organizerAvatar: (row.organizer_name || 'OR').slice(0, 2).toUpperCase(),
    lat: row.lat,
    lng: row.lng,
    ticketTiers: tiers,
    tables: [],
    bottleService: [],
  };
}

// ─── EVENTS ───────────────────────────────────────────────
export async function getEvents(opts?: {
  category?: string;
  city?: string;
  featured?: boolean;
  limit?: number;
}): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('*, ticket_tiers(*)')
    .eq('status', 'published')
    .order('date', { ascending: true });

  if (opts?.category && opts.category !== 'all') query = query.eq('category', opts.category);
  if (opts?.city) query = query.eq('city', opts.city);
  if (opts?.featured) query = query.eq('featured', true);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error || !data || data.length === 0) return MOCK_EVENTS;
  return data.map(transformEvent);
}

export async function getEventById(id: string): Promise<Event | null> {
  // UUID = from DB, short string = mock data
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) return MOCK_EVENTS.find(e => e.id === id) || null;

  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_tiers(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformEvent(data);
}

// ─── TICKETS ──────────────────────────────────────────────
export async function getUserTickets(userId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, events(*, ticket_tiers(*)), ticket_tiers(*)')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false });

  if (error || !data || data.length === 0) return MOCK_TICKETS;

  return data.map((row: any) => ({
    id: row.id,
    ticketId: row.ticket_id,
    eventId: row.event_id,
    event: transformEvent(row.events),
    tier: {
      id: row.ticket_tiers?.id || '',
      name: row.ticket_tiers?.name || '',
      price: parseFloat(row.ticket_tiers?.price) || 0,
      description: row.ticket_tiers?.description || '',
      perks: row.ticket_tiers?.perks || [],
      available: row.ticket_tiers?.available || 0,
      total: row.ticket_tiers?.total || 0,
      gradient: row.ticket_tiers?.gradient || GRADIENT_STYLES[0],
    },
    quantity: row.quantity,
    totalAmount: parseFloat(row.total_amount),
    purchasedAt: row.purchased_at,
    status: row.status,
    qrCode: row.qr_code,
    holderName: row.holder_name,
    holderEmail: row.holder_email,
  }));
}

// ─── PURCHASE ─────────────────────────────────────────────
export async function purchaseTicket(opts: {
  eventId: string;
  tierId: string;
  userId: string;
  quantity: number;
  totalAmount: number;
  holderName: string;
  holderEmail: string;
}): Promise<{ ticketId: string } | null> {
  const ticketId = `FTE-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { error } = await supabase.from('tickets').insert({
    ticket_id: ticketId,
    event_id: opts.eventId,
    tier_id: opts.tierId,
    user_id: opts.userId,
    quantity: opts.quantity,
    total_amount: opts.totalAmount,
    holder_name: opts.holderName,
    holder_email: opts.holderEmail,
    qr_code: ticketId,
    status: 'upcoming',
  });

  if (error) { console.error('Purchase error:', error); return null; }
  return { ticketId };
}

// ─── AUTH HELPERS ─────────────────────────────────────────
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}
