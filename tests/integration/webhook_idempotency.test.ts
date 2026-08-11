import { describe, it, expect } from 'vitest'
import { supabaseConfigured, adminClient } from './helpers'

const maybeDescribe = supabaseConfigured ? describe : describe.skip

maybeDescribe('webhook_events idempotency', () => {
  it('accepts the first insert of an event id and rejects a duplicate', async () => {
    const admin = adminClient()
    const eventId = `evt_test_${Date.now()}`

    const first = await admin.from('webhook_events').insert({ id: eventId, type: 'checkout.session.completed' })
    expect(first.error).toBeNull()

    // Simulates Stripe retrying delivery of the exact same event id — our
    // webhook route relies on this conflict to short-circuit reprocessing.
    const duplicate = await admin.from('webhook_events').insert({ id: eventId, type: 'checkout.session.completed' })
    expect(duplicate.error).not.toBeNull()

    await admin.from('webhook_events').delete().eq('id', eventId)
  })
})
