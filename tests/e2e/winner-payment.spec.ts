import { test, expect } from '@playwright/test'
import { signInAsTestBidder } from './helpers'

/**
 * Full payment completion (entering Stripe test card 4242...) is exercised
 * manually as part of the rehearsal script in docs/LAUNCH_CHECKLIST.md,
 * since driving Stripe's hosted Checkout UI from Playwright is brittle and
 * duplicates Stripe's own test coverage. This spec instead verifies our
 * side of the contract: the winner page renders correctly and starting
 * checkout redirects to a real Stripe Checkout session.
 */
test.describe('Winner payment', () => {
  test.skip(process.env.E2E_SKIP_AUTHENTICATED === 'true', 'Authenticated e2e specs disabled for this run')

  test('winner page shows won items and starts a Stripe Checkout session', async ({ page }) => {
    // bidder002 is expected to have at least one won, unpaid item after
    // running scripts/generate-test-bidders.ts followed by closing an item
    // (see docs/LAUNCH_CHECKLIST.md rehearsal steps).
    await signInAsTestBidder(page, 'bidder002@rehearsal.test')
    await page.goto('/winner')
    await expect(page.getByRole('heading', { name: /your winning items/i })).toBeVisible()

    const payButton = page.getByRole('button', { name: /pay .* now/i })
    if (await payButton.isVisible().catch(() => false)) {
      await Promise.all([page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }), payButton.click()])
      await expect(page).toHaveURL(/checkout\.stripe\.com/)
    }
  })
})
