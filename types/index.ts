// ─── Raw Supabase DB rows (snake_case) ────────────────────────────────────────

export type UserRole =
  | 'attendee'
  | 'host'
  | 'event_manager'
  | 'admin'
  | 'super_admin';

export interface DbProfile {
  id: string;
  display_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string;
  avatar_color?: string;
  initials?: string;
  bio?: string;
  location?: string;
  loyalty_points?: number;
  is_vip?: boolean;
  /** Legacy values are accepted only while the production migration normalises existing rows. */
  role?: UserRole | 'user' | 'organizer';
  account_status?: 'active' | 'suspended' | 'deleted';
  total_spent?: number;
  events_attended?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbEvent {
  id: string;
  title: string;
  slug: string;
  category: string;
  category_label: string;
  description?: string;
  long_description?: string;
  date: string;           // DATE — 'YYYY-MM-DD'
  time: string;           // TIME — 'HH:MM:SS'
  end_time?: string;
  venue: string;
  address?: string;
  city?: string;
  price?: number | string;
  capacity?: number;
  attendees?: number;
  image_url?: string;
  mood?: string;
  tags?: string[];
  featured?: boolean;
  lineup?: string[];
  organizer_id?: string;
  organizer_name?: string;
  lat?: number | string | null;
  lng?: number | string | null;
  status?: string;
  created_at?: string;
}

export interface DbTicket {
  id: string;
  ticket_id: string;
  event_id: string;
  tier_id: string;
  user_id?: string;
  quantity: number;
  total_amount: number;
  holder_name: string;
  holder_email: string;
  qr_code: string;
  status: 'upcoming' | 'past' | 'cancelled' | 'checked-in';
  checked_in_at?: string;
  purchased_at: string;
  // joined
  events?: DbEvent;
  ticket_tiers?: DbTicketTier;
}

export interface DbTicketTier {
  id: string;
  event_id: string;
  name: string;
  price: number;
  description?: string;
  perks?: string[];
  available?: number;
  total?: number;
  gradient?: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  type: 'ticket' | 'reminder' | 'update' | 'system' | 'promo';
  title: string;
  message: string;
  event_id?: string;
  read: boolean;
  created_at: string;
}

// ─── UI types (camelCase — used in components) ────────────────────────────────

export interface TicketTier {
  id: string; name: string; price: number; description: string;
  perks: string[]; available: number; total: number; gradient: string;
}
export interface TableOption {
  id: string; name: string; seats: number; price: number;
  perks: string[]; available: boolean; position: { x: number; y: number };
}
export interface BottleItem {
  id: string; name: string; type: string; price: number; image: string; description: string;
}
export interface Event {
  id: string; title: string; slug: string; category: string; categoryLabel: string;
  date: string; dateISO: string; time: string; endTime: string;
  venue: string; address: string; city: string; description: string; longDescription: string;
  price: number; priceLabel: string; attendees: number; capacity: number;
  image: string; landscapeImage?: string; images: string[]; mood: string; tags: string[];
  featured: boolean; lineup: string[]; organizer: string; organizerAvatar: string;
  lat?: number; lng?: number;
  ticketTiers: TicketTier[]; tables?: TableOption[]; bottleService?: BottleItem[];
}
export interface BottleOrder { item: BottleItem; quantity: number; }
export interface Ticket {
  id: string; ticketId: string; eventId: string;
  event: { id: string; title: string; date: string; time: string; venue: string; image: string; slug: string };
  tier: { id: string; name: string; price: number };
  quantity: number; totalAmount: number; purchasedAt: string;
  status: 'upcoming' | 'past' | 'cancelled' | 'checked-in';
  qrCode: string; holderName: string; holderEmail: string;
}

/**
 * Canonical production wallet shape. One row represents one independently
 * scannable admission. Raw QR tokens never belong in persisted ticket data.
 */
export interface WalletTicket {
  id: string;
  ticketNumber: string;
  eventId: string;
  status: 'issued' | 'checked_in' | 'cancelled' | 'revoked';
  issuedAt: string;
  checkedInAt: string | null;
  gate: string | null;
  holderName: string;
  holderEmail: string;
  event: {
    id: string;
    title: string;
    slug: string;
    startsAt: string;
    date: string;
    time: string;
    venue: string;
    address: string;
    image: string;
    category: string;
  };
  ticketType: {
    id: string;
    name: string;
    price: number;
  };
}
export interface Notification {
  id: string; type: 'ticket' | 'reminder' | 'update' | 'system' | 'promo';
  title: string; message: string; time: string; read: boolean; eventId?: string;
}
export interface Badge {
  id: string; name: string; icon: string; description: string; earned: boolean; earnedAt?: string;
}
export interface User {
  id: string; name: string; email: string; avatar: string; avatarColor: string; initials: string;
  bio: string; location: string; joinedAt: string; loyaltyPoints: number; badges: Badge[];
  eventsAttended: number; totalSpent: number; isVip: boolean; role: UserRole;
}
export interface AnalyticsData { date: string; tickets: number; revenue: number; attendance: number; }
export interface Comment { id: string; author: string; avatar: string; avatarColor: string; text: string; time: string; likes: number; }
