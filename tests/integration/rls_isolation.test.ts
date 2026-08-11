import { describe, it, expect } from 'vitest'
import { supabaseConfigured, createTestBidder, createTestItem, cleanupTestData } from './helpers'

const maybeDescribe = supabaseConfigured ? describe : describe.skip

maybeDescribe('RLS isolation between bidders', () => {
  it("a bidder cannot read another bidder's bid rows", async () => {
    const itemId = await createTestItem({ opening_bid_cents: 5000, min_increment_cents: 500 })
    const bidderA = await createTestBidder('rls-a')
    const bidderB = await createTestBidder('rls-b')

    const { data: bidResult } = await bidderA.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5000 })
    const bidId = bidResult![0]!.bid_id

    // Bidder B queries the bids table directly — RLS must return nothing
    // for bidder A's row, not an error (so it doesn't leak existence).
    const { data: leaked, error } = await bidderB.client.from('bids').select('*').eq('id', bidId)
    expect(error).toBeNull()
    expect(leaked).toEqual([])

    // Bidder A can read their own row.
    const { data: own } = await bidderA.client.from('bids').select('*').eq('id', bidId)
    expect(own?.length).toBe(1)

    await cleanupTestData([itemId], [bidderA.id, bidderB.id])
  })

  it('current_bid_bidder_id is never exposed to bidders via the items table', async () => {
    const itemId = await createTestItem({ opening_bid_cents: 5000, min_increment_cents: 500 })
    const bidder = await createTestBidder('rls-mask')
    await bidder.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5000 })

    // Selecting the revoked column should error (permission denied),
    // proving it cannot be read even by the bidder who is currently leading.
    const { error } = await bidder.client.from('items').select('current_bid_bidder_id').eq('id', itemId)
    expect(error).not.toBeNull()

    await cleanupTestData([itemId], [bidder.id])
  })

  it("my_bids() correctly reports leading status without exposing other bidders' identities", async () => {
    const itemId = await createTestItem({ opening_bid_cents: 5000, min_increment_cents: 500 })
    const bidderA = await createTestBidder('rls-lead-a')
    const bidderB = await createTestBidder('rls-lead-b')

    await bidderA.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5000 })
    await bidderB.client.rpc('place_bid', { p_item_id: itemId, p_amount_cents: 5500 })

    const { data: aBids } = await bidderA.client.rpc('my_bids')
    const { data: bBids } = await bidderB.client.rpc('my_bids')

    expect(aBids?.find((r) => r.item_id === itemId)?.is_leading).toBe(false)
    expect(bBids?.find((r) => r.item_id === itemId)?.is_leading).toBe(true)

    await cleanupTestData([itemId], [bidderA.id, bidderB.id])
  })
})
