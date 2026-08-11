import Link from 'next/link'
import { requireAdmin } from '@/lib/adminGuard'

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/items', label: 'Items' },
  { href: '/admin/bidders', label: 'Bidders' },
  { href: '/admin/exports', label: 'Exports' },
  { href: '/admin/audit', label: 'Audit log' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/status', label: 'System status' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <aside>
        <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
          Signed in as {admin.fullName}
        </p>
        <nav className="flex flex-col gap-1 text-sm font-medium" aria-label="Admin">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="focus-ring rounded px-2 py-1.5 hover:bg-neutral-100">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  )
}
