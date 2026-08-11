import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { centsToDisplay } from '@/lib/money'
import { PauseControl } from './PauseControl'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const admin = createAdminSupabaseClient()

  const [{ count: bidderCount }, { data: settings }, { data: items }, { count: paidCount }, { count: pendingPayments }] =
    await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'bidder'),
      admin.from('auction_settings').select('*').single(),
      admin
        .from('items')
        .select('id, title, status, current_bid_cents, winner_bidder_id, closing_time')
        .order('display_order'),
      admin.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
      admin.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

  const openCount = items?.filter((i) => i.status === 'open').length ?? 0
  const closedCount = items?.filter((i) => i.status === 'closed').length ?? 0
  const totalRaisedCents = items?.reduce((sum, i) => sum + (i.status === 'closed' ? (i.current_bid_cents ?? 0) : 0), 0) ?? 0

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>

      <PauseControl paused={settings?.bidding_paused ?? false} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Registered bidders" value={String(bidderCount ?? 0)} />
        <Stat label="Open items" value={String(openCount)} />
        <Stat label="Closed items" value={String(closedCount)} />
        <Stat label="Provisional total (closed items)" value={centsToDisplay(totalRaisedCents)} />
        <Stat label="Payments received" value={String(paidCount ?? 0)} />
        <Stat label="Payments pending" value={String(pendingPayments ?? 0)} />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500">
            <tr>
              <th className="p-3">Item</th>
              <th className="p-3">Status</th>
              <th className="p-3">Current bid</th>
              <th className="p-3">Closes</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-3 font-medium">{item.title}</td>
                <td className="p-3 capitalize">{item.status}</td>
                <td className="p-3">{item.current_bid_cents ? centsToDisplay(item.current_bid_cents) : '—'}</td>
                <td className="p-3">{new Date(item.closing_time).toLocaleString('en-AU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs uppercase text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-neutral-900">{value}</p>
    </div>
  )
}
