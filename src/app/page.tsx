import Link from 'next/link'
import { siteConfig } from '@/lib/config'

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-xl bg-gradient-to-br from-brand to-brand-dark px-6 py-12 text-center text-white sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
          {siteConfig.organisationName}
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{siteConfig.eventName}</h1>
        <p className="mt-3 text-white/90">{siteConfig.eventDateLabel} &middot; Bidding in AUD</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="focus-ring rounded-lg bg-accent px-6 py-3 font-semibold text-neutral-900 hover:brightness-95"
          >
            Register to bid
          </Link>
          <Link
            href="/items"
            className="focus-ring rounded-lg border border-white/60 px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Browse items
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <InfoCard
          title="1. Register"
          body="Enter your name, email and mobile number, and accept the auction terms and privacy notice."
        />
        <InfoCard
          title="2. Bid on your phone"
          body="Sign in with a one-time code sent to your email — no password to remember on the night."
        />
        <InfoCard
          title="3. Pay online if you win"
          body="Winners pay securely for every item they won in a single checkout after the auction closes."
        />
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">About this auction</h2>
        <p className="mt-2 text-neutral-700">
          [PLACEHOLDER: confirm final &quot;about the auction&quot; wording, event story and beneficiary
          impact statement with {siteConfig.organisationShortName} before launch.]
        </p>
      </section>
    </div>
  )
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <h3 className="font-semibold text-brand">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{body}</p>
    </div>
  )
}
