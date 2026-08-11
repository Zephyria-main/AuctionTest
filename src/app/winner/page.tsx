import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { WinnerCheckout } from './WinnerCheckout'

export const dynamic = 'force-dynamic'

export default async function WinnerPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: wonItems } = await supabase
    .from('items')
    .select('id, title, current_bid_cents, status, winner_bidder_id')
    .eq('winner_bidder_id', user.id)
    .eq('status', 'closed')

  const { data: payments } = await supabase
    .from('payments')
    .select('id, status, payment_items(item_id)')
    .eq('winner_bidder_id', user.id)

  const paidItemIds = new Set(
    (payments ?? [])
      .filter((p) => p.status === 'paid' || p.status === 'offline_paid')
      .flatMap((p) => (p as unknown as { payment_items: { item_id: string }[] }).payment_items.map((pi) => pi.item_id))
  )

  const unpaidItems = (wonItems ?? []).filter((item) => !paidItemIds.has(item.id))
  const paidItems = (wonItems ?? []).filter((item) => paidItemIds.has(item.id))

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900">Your winning items</h1>
      <WinnerCheckout unpaidItems={unpaidItems ?? []} paidItems={paidItems ?? []} />
    </div>
  )
}
