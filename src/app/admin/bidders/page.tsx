import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminBiddersPage() {
  const admin = createAdminSupabaseClient()
  const { data: bidders } = await admin
    .from('profiles')
    .select('bidder_number, full_name, email, mobile, marketing_consent, created_at')
    .eq('role', 'bidder')
    .order('bidder_number')

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Bidders</h1>
      <p className="mt-1 text-sm text-neutral-600">{bidders?.length ?? 0} registered.</p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Mobile</th>
              <th className="p-3">Marketing consent</th>
              <th className="p-3">Registered</th>
            </tr>
          </thead>
          <tbody>
            {bidders?.map((b) => (
              <tr key={b.bidder_number} className="border-b border-neutral-100 last:border-0">
                <td className="p-3">{b.bidder_number}</td>
                <td className="p-3">{b.full_name}</td>
                <td className="p-3">{b.email}</td>
                <td className="p-3">{b.mobile}</td>
                <td className="p-3">{b.marketing_consent ? 'Yes' : 'No'}</td>
                <td className="p-3">{new Date(b.created_at).toLocaleString('en-AU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
