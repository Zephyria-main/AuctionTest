import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
  const admin = createAdminSupabaseClient()
  const { data: entries } = await admin
    .from('audit_log')
    .select('id, action, target_type, target_id, reason, metadata, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Audit log</h1>
      <p className="mt-1 text-sm text-neutral-600">Append-only. Most recent 200 actions.</p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Action</th>
              <th className="p-3">Target</th>
              <th className="p-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {entries?.map((entry) => {
              const actor = entry.profiles as unknown as { full_name: string } | null
              return (
                <tr key={entry.id} className="border-b border-neutral-100 last:border-0 align-top">
                  <td className="whitespace-nowrap p-3">{new Date(entry.created_at).toLocaleString('en-AU')}</td>
                  <td className="p-3">{actor?.full_name ?? 'System'}</td>
                  <td className="p-3">{entry.action}</td>
                  <td className="p-3">
                    {entry.target_type} {entry.target_id ? `#${entry.target_id.slice(0, 8)}` : ''}
                  </td>
                  <td className="p-3">{entry.reason ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
