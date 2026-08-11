import type { Page } from '@playwright/test'

/** Signs a Playwright page in as a pre-provisioned test bidder via the test-only sign-in route. */
export async function signInAsTestBidder(page: Page, email: string, password = 'Rehearsal-Test-Password-2026!') {
  const response = await page.request.post('/api/test/sign-in', { data: { email, password } })
  if (!response.ok()) {
    throw new Error(
      `Test sign-in failed for ${email} (${response.status()}). Run "npm run seed:test-bidders" against the target environment first.`
    )
  }
}
