import { test, expect } from '@playwright/test'
import { signInAsTestBidder } from './helpers'

/**
 * Requires a target environment seeded via `npm run seed:test-bidders`
 * (creates bidder001@rehearsal.test..bidder100@rehearsal.test) and at
 * least one open item. Skips itself when E2E_SKIP_AUTHENTICATED=true.
 */
test.describe('Bidding', () => {
  test.skip(process.env.E2E_SKIP_AUTHENTICATED === 'true', 'Authenticated e2e specs disabled for this run')

  test('a signed-in bidder can view and confirm a bid', async ({ page }) => {
    await signInAsTestBidder(page, 'bidder001@rehearsal.test')

    await page.goto('/items')
    const openItem = page.locator('a[href^="/items/"]').first()
    await openItem.click()

    const bidInput = page.getByLabel(/your bid \(aud\)/i)
    await expect(bidInput).toBeVisible({ timeout: 10000 })

    const minimumText = await page.getByText(/minimum \$/i).textContent()
    const minimumDollars = Number(minimumText?.match(/\$([\d,.]+)/)?.[1]?.replace(',', '') ?? '0')
    const bidAmount = (minimumDollars + 5).toFixed(2)

    await bidInput.fill(bidAmount)
    await page.getByRole('button', { name: /place bid/i }).click()
    await expect(page.getByText(/confirm your bid of/i)).toBeVisible()

    await page.getByRole('button', { name: /confirm bid/i }).click()
    await expect(page.getByText(/bid was placed successfully/i)).toBeVisible({ timeout: 10000 })
  })

  test("my bids page lists an item the bidder has bid on", async ({ page }) => {
    await signInAsTestBidder(page, 'bidder001@rehearsal.test')
    await page.goto('/my-bids')
    await expect(page.getByRole('heading', { name: /my bids/i })).toBeVisible()
  })
})
