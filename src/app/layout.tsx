import type { Metadata } from 'next'
import './globals.css'
import { siteConfig } from '@/lib/config'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { RehearsalBanner } from '@/components/RehearsalBanner'

export const metadata: Metadata = {
  title: `${siteConfig.eventName} | ${siteConfig.organisationName}`,
  description: `Bid on items in the ${siteConfig.eventName}, supporting ${siteConfig.organisationName}.`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <RehearsalBanner />
        <SiteHeader />
        <main id="main-content" className="mx-auto min-h-[60vh] max-w-5xl px-4 py-6">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
