/**
 * Theme / event configuration.
 *
 * Everything here is a placeholder that MUST be reviewed and confirmed by
 * the Australian Brain Cancer Foundation before launch. See
 * docs/ASSUMPTIONS.md and docs/LAUNCH_CHECKLIST.md.
 */
export const siteConfig = {
  organisationName: 'Australian Brain Cancer Foundation',
  organisationShortName: 'ABCF',
  eventName: process.env.NEXT_PUBLIC_EVENT_NAME ?? 'ABCF Silent Auction [PLACEHOLDER: confirm event name]',
  eventDateLabel: process.env.NEXT_PUBLIC_EVENT_DATE_LABEL ?? '[PLACEHOLDER: confirm event date]',
  timeZone: 'Australia/Sydney',
  currency: 'AUD',
  locale: 'en-AU',
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL ?? '/logo-placeholder.svg',
  colors: {
    brand: '#7A1B3D',
    accent: '#D4A017',
  },
  contact: {
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@[PLACEHOLDER-DOMAIN]',
    supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '[PLACEHOLDER: confirm support phone]',
  },
  legal: {
    termsUrl: '/terms',
    privacyUrl: '/privacy',
    // The actual legal text lives in src/app/(public)/terms and privacy pages
    // and is marked with [PLACEHOLDER] blocks pending ABCF/legal sign-off.
  },
  bidding: {
    /** Default minimum bid increment in cents when an item does not specify one. */
    defaultMinIncrementCents: 500000, // placeholder fallback only; items should set their own
    /** Default closing-extension window, in minutes, applied to a valid bid in the final window. */
    defaultExtensionTriggerMinutes: 2,
    /** Default extension length, in minutes, added to closing time when triggered. */
    defaultExtensionMinutes: 2,
  },
} as const

export type SiteConfig = typeof siteConfig
