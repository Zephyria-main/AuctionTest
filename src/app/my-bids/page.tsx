import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { centsToDisplay } from '@/lib/money'
import { formatSydney } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function MyBidsPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: myBids, error } = await supabase.rpc('my_bids')

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">My bids</h1>

      {error ? (
        <p className="mt-4 rounded bg-red-50 px-3 py-2 text-red-800">
          We couldn&apos;t load your bids right now. Please refresh in a moment.
        </p>
      ) : !myBids || myBids.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
          <p>You haven&apos;t bid on anything yet.</p>
          <Link href="/items" className="mt-2 inline-block font-semibold text-brand underline">
            Browse items
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {myBids.map((row) => (
            <Link
              key={row.item_id}
              href={`/items/${row.item_id}`}
              className="focus-ring flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 hover:shadow-sm"
            >
              <div>
                <p className="font-semibold text-neutral-900">{row.item_title}</p>
                <p className="text-sm text-neutral-500">
                  Your highest bid: {centsToDisplay(row.my_highest_bid_cents)} &middot; Closes{' '}
                  {formatSydney(row.closing_time)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  row.is_leading ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {row.item_status === 'closed'
                  ? row.is_leading
                    ? 'You won!'
                    : 'Not won'
                  : row.is_leading
                    ? 'Winning'
                    : 'Outbid'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
