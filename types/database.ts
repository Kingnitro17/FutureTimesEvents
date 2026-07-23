/**
 * TypeScript types generated from the Supabase database schema.
 * Keep in sync with supabase/migrations/*.sql
 * Regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Role enum ───────────────────────────────────────────────
export type UserRole = 'attendee' | 'host' | 'event_manager' | 'admin' | 'super_admin';
export type AccountStatus = 'active' | 'suspended' | 'deleted';

// ─── Event enums ─────────────────────────────────────────────
export type EventStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'sold_out'
  | 'completed'
  | 'cancelled'
  | 'postponed'
  | 'archived';

// ─── Ticket enums ─────────────────────────────────────────────
export type TicketStatus = 'issued' | 'checked_in' | 'cancelled' | 'revoked';
export type ScanResult =
  | 'valid_checked_in'
  | 'already_checked_in'
  | 'not_found'
  | 'wrong_event'
  | 'cancelled'
  | 'revoked'
  | 'invalid_status'
  | 'invalid_token'
  | 'event_not_open';

// ─── Table shapes ─────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          avatar_color: string;
          initials: string;
          bio: string;
          role: UserRole;
          account_status: AccountStatus;
          loyalty_points: number;
          is_vip: boolean;
          events_attended: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };

      events: {
        Row: {
          id: string;
          title: string;
          slug: string;
          subtitle: string | null;
          category: string;
          category_label: string;
          description: string;
          long_description: string;
          status: EventStatus;
          featured: boolean;
          cover_image_url: string | null;
          starts_at: string;  // timestamptz ISO string
          ends_at: string | null;
          timezone: string;
          doors_open_at: string | null;
          venue_id: string | null;
          venue_name: string;
          address: string;
          city: string;
          lat: number | null;
          lng: number | null;
          capacity: number;
          dress_code: string | null;
          age_guidance: string | null;
          event_rules: string | null;
          contact_email: string | null;
          organizer_id: string | null;
          organizer_name: string;
          tags: string[];
          seo_title: string | null;
          seo_description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['events']['Row']> & {
          title: string; slug: string; category: string; category_label: string;
          starts_at: string; venue_name: string;
        };
        Update: Partial<Database['public']['Tables']['events']['Row']>;
      };

      ticket_types: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          description: string;
          price: number;
          quantity_total: number;
          quantity_available: number;
          claim_limit_per_contact: number;
          claim_opens_at: string | null;
          claim_closes_at: string | null;
          is_active: boolean;
          is_visible: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ticket_types']['Row']> & {
          event_id: string; name: string;
        };
        Update: Partial<Database['public']['Tables']['ticket_types']['Row']>;
      };

      ticket_claims: {
        Row: {
          id: string;
          event_id: string;
          ticket_type_id: string;
          quantity: number;
          attendee_name: string;
          attendee_email: string;
          attendee_phone: string | null;
          status: 'confirmed' | 'cancelled';
          idempotency_key: string | null;
          show_in_whos_going: boolean;
          marketing_opt_in: boolean;
          terms_accepted_at: string | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ticket_claims']['Row']> & {
          event_id: string; ticket_type_id: string; attendee_name: string; attendee_email: string;
        };
        Update: Partial<Database['public']['Tables']['ticket_claims']['Row']>;
      };

      tickets: {
        Row: {
          id: string;
          ticket_number: string;
          event_id: string;
          ticket_type_id: string;
          claim_id: string | null;
          user_id: string | null;
          attendee_name: string;
          attendee_email: string;
          attendee_phone: string | null;
          qr_token_hash: string;  // SHA-256 of the raw token — never expose
          status: TicketStatus;
          quantity: number;
          issued_at: string;
          checked_in_at: string | null;
          checked_in_by: string | null;
          gate: string | null;
          cancellation_reason: string | null;
          revocation_reason: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tickets']['Row']> & {
          ticket_number: string; event_id: string; ticket_type_id: string;
          attendee_name: string; attendee_email: string; qr_token_hash: string;
        };
        Update: Partial<Database['public']['Tables']['tickets']['Row']>;
      };

      ticket_scans: {
        Row: {
          id: string;
          ticket_id: string | null;
          event_id: string;
          scanner_id: string;
          gate: string | null;
          scan_result: ScanResult;
          reason: string | null;
          idempotency_key: string | null;
          scanned_at: string;
          metadata: Json;
        };
        Insert: Partial<Database['public']['Tables']['ticket_scans']['Row']> & {
          event_id: string; scanner_id: string; scan_result: ScanResult;
        };
        Update: never;
      };

      event_staff: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          role: 'host' | 'event_manager';
          gate: string | null;
          is_active: boolean;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: Partial<Database['public']['Tables']['event_staff']['Row']> & {
          event_id: string; user_id: string; role: 'host' | 'event_manager';
        };
        Update: Partial<Database['public']['Tables']['event_staff']['Row']>;
      };

      event_faqs: {
        Row: {
          id: string;
          event_id: string;
          question: string;
          answer: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['event_faqs']['Row']> & {
          event_id: string; question: string; answer: string;
        };
        Update: Partial<Database['public']['Tables']['event_faqs']['Row']>;
      };

      event_sponsors: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          logo_url: string | null;
          website_url: string | null;
          tier: 'title' | 'gold' | 'silver' | 'bronze' | 'partner';
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['event_sponsors']['Row']> & {
          event_id: string; name: string;
        };
        Update: Partial<Database['public']['Tables']['event_sponsors']['Row']>;
      };

      event_schedule_items: {
        Row: {
          id: string;
          event_id: string;
          title: string;
          description: string | null;
          performer: string | null;
          starts_at: string;
          ends_at: string | null;
          stage: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['event_schedule_items']['Row']> & {
          event_id: string; title: string; starts_at: string;
        };
        Update: Partial<Database['public']['Tables']['event_schedule_items']['Row']>;
      };

      event_media: {
        Row: {
          id: string;
          event_id: string;
          url: string;
          storage_path: string | null;
          media_type: 'image' | 'video';
          alt_text: string | null;
          caption: string | null;
          is_cover: boolean;
          is_published: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['event_media']['Row']> & {
          event_id: string; url: string; media_type: 'image' | 'video';
        };
        Update: Partial<Database['public']['Tables']['event_media']['Row']>;
      };

      attendee_visibility: {
        Row: {
          id: string;
          ticket_id: string;
          event_id: string;
          is_visible: boolean;
          public_display_name: string | null;
          public_message: string | null;
          avatar_permission: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['attendee_visibility']['Row']> & {
          ticket_id: string; event_id: string;
        };
        Update: Partial<Database['public']['Tables']['attendee_visibility']['Row']>;
      };

      notification_jobs: {
        Row: {
          id: string;
          type: string;
          recipient_email: string;
          recipient_name: string | null;
          payload: Json;
          scheduled_at: string;
          status: 'queued' | 'sent' | 'failed' | 'cancelled';
          attempt_count: number;
          provider_result: Json | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notification_jobs']['Row']> & {
          type: string; recipient_email: string; payload: Json;
        };
        Update: Partial<Database['public']['Tables']['notification_jobs']['Row']>;
      };

      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before_state: Json | null;
          after_state: Json | null;
          ip_hash: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']> & {
          action: string; entity_type: string;
        };
        Update: never;
      };
    };

    Functions: {
      verify_and_checkin: {
        Args: {
          p_token_hash: string;
          p_scanner_id: string;
          p_event_id: string;
          p_gate?: string;
        };
        Returns: Json;
      };
      claim_ticket_atomic: {
        Args: {
          p_event_id: string;
          p_ticket_type_id: string;
          p_attendee_name: string;
          p_attendee_email: string;
          p_attendee_phone?: string;
          p_quantity?: number;
          p_idempotency_key?: string;
          p_show_in_whos_going?: boolean;
          p_marketing_opt_in?: boolean;
          p_qr_token_hash: string;
          p_ticket_number: string;
        };
        Returns: Json;
      };
      get_my_role: {
        Args: Record<never, never>;
        Returns: string;
      };
    };
  };
}
