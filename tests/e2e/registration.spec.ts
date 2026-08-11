import { test, expect } from '@playwright/test'

test.describe('Registration', () => {
  test('landing page links to registration', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.getByRole('link', { name: /register to bid/i }).click()
    await expect(page).toHaveURL(/\/register/)
  });

  test('registration form requires terms and privacy acceptance', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Full name').fill('Test Bidder')
    await page.getByLabel('Email address').fill(`e2e-${Date.now()}@example.com`)
    await page.getByLabel('Mobile number').fill('0412345678')
    // Deliberately leave the required checkboxes unchecked.
    const submit = page.getByRole('button', { name: /^register$/i })
    await submit.click()
    // Native HTML5 required-field validation blocks submission client-side,
    // so we should still be on the registration page.
    await expect(page).toHaveURL(/\/register/)
  })

  test('submitting a complete registration shows the confirmation screen', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Full name').fill('Test Bidder')
    await page.getByLabel('Email address').fill(`e2e-${Date.now()}@example.com`)
    await page.getByLabel('Mobile number').fill('0412345678')
    await page.getByLabel(/accept the/i).check()
    await page.getByLabel(/privacy notice/i).check()
    await page.getByRole('button', { name: /^register$/i }).click()
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({ timeout: 10000 })
  })
})
