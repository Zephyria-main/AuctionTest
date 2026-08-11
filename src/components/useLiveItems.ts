'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

export type PublicItem = Omit<Database['public']['Tables']['items']['Row'], 'current_bid_bidder_id'>

/**
 * Subscribes to realtime changes on the items table and keeps a local map
 * up to date. If the realtime connection drops, the catalogue remains
 * fully readable from the last known state (per the reliability
 * requirement) and we fall back to polling + refetch-on-reconnect so data
 * self-heals once the network recovers, without the bidder doing anything.
 */
export function useLiveItems(initialItems: PublicItem[]) {
  const [items, setItems] = useState<Map<string, PublicItem>>(
    () => new Map(initialItems.map((i) => [i.id, i]))
  )
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting'
  )
  const supabaseRef = useRef(createClient())

  const refetchAll = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from('items')
      .select(
        'id, title, short_description, full_description, donor_name, estimated_value_cents, opening_bid_cents, min_increment_cents, current_bid_cents, closing_time, status, display_order, extensions_enabled, extension_trigger_minutes, extension_minutes, winner_bidder_id, winning_bid_id, created_at, updated_at'
      )
      .order('display_order', { ascending: true })
    if (data) {
      setItems(new Map(data.map((i) => [i.id, i as PublicItem])))
    }
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel('items-catalogue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
        setItems((prev) => {
          const next = new Map(prev)
          if (payload.eventType === 'DELETE') {
            next.delete((payload.old as { id: string }).id)
          } else {
            const row = payload.new as PublicItem
            next.set(row.id, row)
          }
          return next
        })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected')
          // Refresh from source of truth on (re)connect in case events were missed.
          refetchAll()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionState('disconnected')
        }
      })

    // Poll as a safety net even when realtime looks connected — cheap at
    // this scale (~15 items, one auction) and guarantees eventual
    // consistency if a change event is ever dropped silently.
    const pollId = setInterval(refetchAll, 20000)

    return () => {
      clearInterval(pollId)
      supabase.removeChannel(channel)
    }
  }, [refetchAll])

  return { items: Array.from(items.values()).sort((a, b) => a.display_order - b.display_order), connectionState }
}
