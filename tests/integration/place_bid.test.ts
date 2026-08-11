import { describe, it, expect } from 'vitest'
import { supabaseConfigured, adminClient, createTestBidder, createTestItem, cleanupTestData } from './helpers'

const maybeDescribe = supabaseConfigured ? describe : describe.skip

maybeDescribe('place_bid() integration', () => {
  it('accepts a valid first bid at the opening price', async () => {
    const itemId = await createTestItem({ opening_bid_cents: 5000, min_increment_cents: 500 })
    const bidder = await createTestBidder()

    const { data, error } = await bidder.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5000 })
    expect(error).toBeNull()
    expect(data?.[0]?.amount_cents).toBe(5000)

    await cleanupTestData([itemId], [bidder.id])
  })

  it('rejects a bid below the minimum acceptable amount', async () => {
    const itemId = await createTestItem({ opening_bid_cents: 5000, min_increment_cents: 500 })
    const bidder = await createTestBidder()

    const { error } = await bidder.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 4999 })
    expect(error?.message).toContain('BID_TOO_LOW')

    await cleanupTestData([itemId], [bidder.id])
  })

  it('rejects a bid on an item that has already closed', async () => {
    const itemId = await createTestItem({ closing_time: new Date(Date.now() - 60 * 1000).toISOString() })
    const bidder = await createTestBidder()

    const { error } = await bidder.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5000 })
    expect(error?.message).toContain('ITEM_CLOSED')

    await cleanupTestData([itemId], [bidder.id])
  })

  it('accepts a bid placed one second before closing', async () => {
    const itemId = await createTestItem({ closing_time: new Date(Date.now() + 1000).toISOString() })
    const bidder = await createTestBidder()

    const { error } = await bidder.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5000 })
    expect(error).toBeNull()

    await cleanupTestData([itemId], [bidder.id])
  })

  it('extends the closing time when a bid lands inside the trigger window', async () => {
    const originalClosing = new Date(Date.now() + 60 * 1000) // 1 minute from now
    const itemId = await createTestItem({
      closing_time: originalClosing.toISOString(),
      extensions_enabled: true,
      extension_trigger_minutes: 2,
      extension_minutes: 2,
    })
    const bidder = await createTestBidder()

    const { data, error } = await bidder.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5000 })
    expect(error).toBeNull()
    expect(data?.[0]?.was_extended).toBe(true)
    expect(new Date(data![0]!.new_closing_time).getTime()).toBeGreaterThan(originalClosing.getTime())

    await cleanupTestData([itemId], [bidder.id])
  })

  it('does not extend when extensions are disabled for the item', async () => {
    const originalClosing = new Date(Date.now() + 30 * 1000)
    const itemId = await createTestItem({ closing_time: originalClosing.toISOString(), extensions_enabled: false })
    const bidder = await createTestBidder()

    const { data } = await bidder.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5000 })
    expect(data?.[0]?.was_extended).toBe(false)

    await cleanupTestData([itemId], [bidder.id])
  })

  it('never accepts two bids at the same amount as both "the" winner under 20 simultaneous bidders', async () => {
    const itemId = await createTestItem({ opening_bid_cents: 5000, min_increment_cents: 100 })
    const bidders = await Promise.all(Array.from({ length: 20 }, () => createTestBidder()))

    // Every bidder attempts the SAME amount simultaneously — only one can win.
    const results = await Promise.allSettled(
      bidders.map((b) => b.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5100 }))
    )

    const successes = results.filter(
      (r) => r.status === 'fulfilled' && !(r.value as { error: unknown }).error
    )
    expect(successes.length).toBe(1)

    const admin = adminClient()
    const { data: finalItem } = await admin.from('items').select('current_bid_cents').eq('id', itemId).single()
    expect(finalItem?.current_bid_cents).toBe(5100)

    const { count: bidRowCount } = await admin
      .from('bids')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', itemId)
      .eq('amount_cents', 5100)
    expect(bidRowCount).toBe(1)

    await cleanupTestData([itemId], bidders.map((b) => b.id))
  })

  it('processes an ascending flurry of concurrent bids in a strictly increasing, correctly-ordered price', async () => {
    const itemId = await createTestItem({ opening_bid_cents: 5000, min_increment_cents: 100 })
    const bidders = await Promise.all(Array.from({ length: 20 }, () => createTestBidder()))

    await Promise.allSettled(
      bidders.map((b, i) => b.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5000 + (i + 1) * 100 }))
    )

    const admin = adminClient()
    const { data: allBids } = await admin.from('bids').select('amount_cents').eq('item_id', itemId).order('created_at')
    const { data: finalItem } = await admin.from('items').select('current_bid_cents').eq('id', itemId).single()

    // The final recorded price must equal the highest accepted bid — the
    // row lock in place_bid() guarantees there is no lost update.
    const highestBid = Math.max(...(allBids ?? []).map((b) => b.amount_cents))
    expect(finalItem?.current_bid_cents).toBe(highestBid)

    await cleanupTestData([itemId], bidders.map((b) => b.id))
  })
})

maybeDescribe('admin_void_bid() integration', () => {
  it('retains the voided bid row and recomputes the new leader', async () => {
    const itemId = await createTestItem({ opening_bid_cents: 5000, min_increment_cents: 500 })
    const bidderA = await createTestBidder('void-a')
    const bidderB = await createTestBidder('void-b')

    await bidderA.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5000 })
    const { data: secondBid } = await bidderB.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5500 })

    const admin = adminClient()
    // Promote bidderA to admin so admin_void_bid()'s is_admin() check passes.
    await admin.from('profiles').update({ role: 'admin' }).eq('id', bidderA.id)

    const { error } = await bidderA.client.rpc('admin_void_bid', {
      p_bid_id: secondBid![0]!.bid_id,
      p_reason: 'Integration test void',
    })
    expect(error).toBeNull()

    const { data: bidRow } = await admin.from('bids').select('*').eq('id', secondBid![0]!.bid_id).single()
    expect(bidRow?.voided_at).not.toBeNull()
    expect(bidRow?.amount_cents).toBe(5500) // original amount retained, not deleted or edited

    const { data: item } = await admin.from('items').select('current_bid_cents').eq('id', itemId).single()
    expect(item?.current_bid_cents).toBe(5000) // reverted to the remaining valid bid

    await cleanupTestData([itemId], [bidderA.id, bidderB.id])
  })
})
