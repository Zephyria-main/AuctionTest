const EXPORTS = [
  { href: '/api/admin/exports/bidders', label: 'Bidders', description: 'Every registered bidder, including the SupporterHub consent field.' },
  { href: '/api/admin/exports/bids', label: 'Bids', description: 'Every bid ever placed, including voided bids and void reasons.' },
  { href: '/api/admin/exports/winners', label: 'Winners', description: 'The winning bidder and amount for each closed item.' },
  { href: '/api/admin/exports/payments', label: 'Payments', description: 'Every payment record: pending, paid, failed, refunded, offline.' },
]

export default function AdminExportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">CSV exports</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Downloads are generated live from the database and are admin-only.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {EXPORTS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="focus-ring rounded-lg border border-neutral-200 bg-white p-4 hover:shadow-sm"
          >
            <p className="font-semibold text-brand">{item.label}.csv</p>
            <p className="text-sm text-neutral-600">{item.description}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
