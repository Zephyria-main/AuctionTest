/**
 * Hand-authored Supabase types mirroring supabase/migrations/*.sql.
 * Once a real Supabase project exists, regenerate with:
 *   npm run gen:types
 * and replace this file — keep it in sync until then.
 */
export type ItemStatus = 'draft' | 'open' | 'paused' | 'closed'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'offline_paid'
export type ProfileRole = 'bidder' | 'admin'
export type OutboxStatus = 'pending' | 'sent' | 'failed'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: ProfileRole
          bidder_number: number
          full_name: string
          email: string
          mobile: string
          accepted_terms_at: string | null
          accepted_privacy_at: string | null
          marketing_consent: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      auction_settings: {
        Row: {
          id: true
          auction_opens_at: string | null
          auction_closes_at: string | null
          extensions_enabled: boolean
          extension_trigger_minutes: number
          extension_minutes: number
          bidding_paused: boolean
          paused_at: string | null
          paused_by: string | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['auction_settings']['Row']>
        Update: Partial<Database['public']['Tables']['auction_settings']['Row']>
      }
      items: {
        Row: {
          id: string
          title: string
          short_description: string
          full_description: string
          donor_name: string
          estimated_value_cents: number
          opening_bid_cents: number
          min_increment_cents: number
          current_bid_cents: number | null
          current_bid_bidder_id?: string | null
          closing_time: string
          status: ItemStatus
          display_order: number
          extensions_enabled: boolean | null
          extension_trigger_minutes: number | null
          extension_minutes: number | null
          winner_bidder_id: string | null
          winning_bid_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['items']['Row']>
        Update: Partial<Database['public']['Tables']['items']['Row']>
      }
      item_images: {
        Row: {
          id: string
          item_id: string
          storage_path: string
          alt_text: string
          sort_order: number
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['item_images']['Row']>
        Update: Partial<Database['public']['Tables']['item_images']['Row']>
      }
      bids: {
        Row: {
          id: string
          item_id: string
          bidder_id: string
          amount_cents: number
          created_at: string
          voided_at: string | null
          voided_by: string | null
          void_reason: string | null
        }
        Insert: Partial<Database['public']['Tables']['bids']['Row']>
        Update: Partial<Database['public']['Tables']['bids']['Row']>
      }
      payments: {
        Row: {
          id: string
          winner_bidder_id: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          status: PaymentStatus
          amount_cents: number
          is_rehearsal: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['payments']['Row']>
        Update: Partial<Database['public']['Tables']['payments']['Row']>
      }
      payment_items: {
        Row: {
          id: string
          payment_id: string
          item_id: string
          amount_cents: number
        }
        Insert: Partial<Database['public']['Tables']['payment_items']['Row']>
        Update: Partial<Database['public']['Tables']['payment_items']['Row']>
      }
      webhook_events: {
        Row: {
          id: string
          type: string
          received_at: string
          processed_at: string | null
          payload: unknown
        }
        Insert: Partial<Database['public']['Tables']['webhook_events']['Row']> & { id: string; type: string }
        Update: Partial<Database['public']['Tables']['webhook_events']['Row']>
      }
      email_outbox: {
        Row: {
          id: string
          template_key: string
          recipient_bidder_id: string
          payload: Record<string, unknown>
          dedupe_key: string
          status: OutboxStatus
          attempts: number
          last_error: string | null
          created_at: string
          sent_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['email_outbox']['Row']>
        Update: Partial<Database['public']['Tables']['email_outbox']['Row']>
      }
      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          target_type: string | null
          target_id: string | null
          reason: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['audit_log']['Row']>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: {
      place_bid: {
        Args: { p_item_id: string; p_amount_cents: number }
        Returns: {
          bid_id: string
          item_id: string
          item_title: string
          amount_cents: number
          new_closing_time: string
          was_extended: boolean
          previous_bidder_id: string | null
        }[]
      }
      my_bids: {
        Args: Record<string, never>
        Returns: {
          item_id: string
          item_title: string
          my_highest_bid_cents: number
          current_bid_cents: number | null
          is_leading: boolean
          item_status: ItemStatus
          closing_time: string
        }[]
      }
      admin_set_bidding_paused: {
        Args: { p_paused: boolean; p_reason?: string | null }
        Returns: void
      }
      admin_set_item_status: {
        Args: { p_item_id: string; p_status: ItemStatus; p_reason?: string | null }
        Returns: Database['public']['Tables']['items']['Row']
      }
      admin_void_bid: {
        Args: { p_bid_id: string; p_reason: string }
        Returns: void
      }
      close_expired_items: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['items']['Row'][]
      }
      server_now: {
        Args: Record<string, never>
        Returns: string
      }
      reset_rehearsal_data: {
        Args: { p_email_pattern: string }
        Returns: { deleted_bidders: number; deleted_bids: number; deleted_payments: number }[]
      }
    }
  }
}
