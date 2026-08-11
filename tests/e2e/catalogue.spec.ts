import { test, expect } from '@playwright/test'

test.describe('Catalogue', () => {
  test('shows the item catalogue with working filters on mobile', async ({ page }) => {
    await page.goto('/items')
    await expect(page.getByRole('heading', { name: /auction items/i })).toBeVisible()

    await page.getByRole('button', { name: 'Open' }).click()
    await expect(page.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'All' }).click()
    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('an unauthenticated visitor is prompted to sign in on the item page', async ({ page }) => {
    await page.goto('/items')
    const firstItem = page.locator('a[href^="/items/"]').first()
    await firstItem.click()
    await expect(page.getByRole('link', { name: /^register$/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  })
})
