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
  image: string; images: string[]; mood: string; tags: string[];
  featured: boolean; lineup?: string[]; organizer: string; organizerAvatar: string;
  lat?: number; lng?: number;
  ticketTiers: TicketTier[]; tables?: TableOption[]; bottleService?: BottleItem[];
}
export interface BottleOrder { item: BottleItem; quantity: number; }
export interface Ticket {
  id: string; ticketId: string; eventId: string; event: Event; tier: TicketTier;
  quantity: number; totalAmount: number; purchasedAt: string;
  status: 'upcoming' | 'past' | 'cancelled' | 'checked-in';
  qrCode: string; holderName: string; holderEmail: string;
  tableBooking?: TableOption; bottleOrders?: BottleOrder[];
}
export interface Badge { id: string; name: string; icon: string; description: string; earned: boolean; earnedAt?: string; }
export interface User {
  id: string; name: string; email: string; avatar: string; avatarColor: string; initials: string;
  bio: string; location: string; joinedAt: string; loyaltyPoints: number; badges: Badge[];
  eventsAttended: number; totalSpent: number; isVip: boolean; role: 'user' | 'organizer' | 'admin';
}
export interface Notification {
  id: string; type: 'ticket' | 'reminder' | 'update' | 'system' | 'promo';
  title: string; message: string; time: string; read: boolean; eventId?: string; actionUrl?: string;
}
export interface AnalyticsData { date: string; tickets: number; revenue: number; attendance: number; }
export interface Comment { id: string; author: string; avatar: string; avatarColor: string; text: string; time: string; likes: number; }
