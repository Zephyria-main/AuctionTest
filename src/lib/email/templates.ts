import { siteConfig } from '@/lib/config'
import { centsToDisplay } from '@/lib/money'

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

function wrapHtml(bodyHtml: string): string {
  return `<!doctype html>
<html lang="en-AU">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; background:#f7f5f3; margin:0; padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
      <p style="color:#7A1B3D;font-weight:700;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;margin:0 0 16px;">
        ${siteConfig.organisationShortName} &middot; ${siteConfig.eventName}
      </p>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 16px;" />
      <p style="color:#737373;font-size:12px;line-height:1.5;">
        This is a transactional message about your silent auction activity, sent because you registered
        for ${siteConfig.eventName}. Questions? Contact ${siteConfig.contact.supportEmail}.
      </p>
    </div>
  </body>
</html>`
}

export function registrationConfirmedEmail(params: { fullName: string; bidderNumber: number }): RenderedEmail {
  const subject = `You're registered — Bidder #${params.bidderNumber}`
  const html = wrapHtml(`
    <h1 style="font-size:20px;color:#171717;">G'day ${params.fullName},</h1>
    <p>Thanks for registering for ${siteConfig.eventName}. Your bidder number is <strong>#${params.bidderNumber}</strong>.</p>
    <p>Sign in any time with your email address to browse items and place bids.</p>
  `)
  const text = `G'day ${params.fullName},\n\nThanks for registering for ${siteConfig.eventName}. Your bidder number is #${params.bidderNumber}.\n\nSign in any time with your email address to browse items and place bids.`
  return { subject, html, text }
}

export function authCodeEmail(params: { code: string; magicLinkUrl: string }): RenderedEmail {
  const subject = `Your sign-in code: ${params.code}`
  const html = wrapHtml(`
    <h1 style="font-size:20px;color:#171717;">Your sign-in code</h1>
    <p style="font-size:28px;font-weight:700;letter-spacing:0.08em;">${params.code}</p>
    <p>Or use this link on the device you're signing in on:</p>
    <p><a href="${params.magicLinkUrl}" style="color:#7A1B3D;">${params.magicLinkUrl}</a></p>
    <p>This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
  `)
  const text = `Your sign-in code: ${params.code}\n\nOr use this link: ${params.magicLinkUrl}\n\nThis code expires in 10 minutes.`
  return { subject, html, text }
}

export function bidConfirmationEmail(params: {
  fullName: string
  itemTitle: string
  amountCents: number
  itemUrl: string
}): RenderedEmail {
  const subject = `Bid confirmed: ${params.itemTitle}`
  const html = wrapHtml(`
    <h1 style="font-size:20px;color:#171717;">Bid confirmed</h1>
    <p>Hi ${params.fullName}, your bid of <strong>${centsToDisplay(params.amountCents)}</strong> on
    <strong>${params.itemTitle}</strong> has been recorded.</p>
    <p><a href="${params.itemUrl}" style="color:#7A1B3D;">View item</a></p>
  `)
  const text = `Hi ${params.fullName}, your bid of ${centsToDisplay(params.amountCents)} on ${params.itemTitle} has been recorded.\n\nView item: ${params.itemUrl}`
  return { subject, html, text }
}

export function outbidNotificationEmail(params: {
  fullName: string
  itemTitle: string
  currentAmountCents: number
  itemUrl: string
}): RenderedEmail {
  const subject = `You've been outbid: ${params.itemTitle}`
  const html = wrapHtml(`
    <h1 style="font-size:20px;color:#171717;">You've been outbid</h1>
    <p>Hi ${params.fullName}, someone placed a higher bid on <strong>${params.itemTitle}</strong>.
    The current bid is now <strong>${centsToDisplay(params.currentAmountCents)}</strong>.</p>
    <p><a href="${params.itemUrl}" style="color:#7A1B3D;">Place a new bid</a></p>
  `)
  const text = `Hi ${params.fullName}, you've been outbid on ${params.itemTitle}. Current bid: ${centsToDisplay(params.currentAmountCents)}.\n\n${params.itemUrl}`
  return { subject, html, text }
}

export function closingSoonEmail(params: {
  fullName: string
  itemTitle: string
  closingTimeLabel: string
  itemUrl: string
}): RenderedEmail {
  const subject = `Closing soon: ${params.itemTitle}`
  const html = wrapHtml(`
    <h1 style="font-size:20px;color:#171717;">Closing soon</h1>
    <p>Hi ${params.fullName}, <strong>${params.itemTitle}</strong> closes at
    ${params.closingTimeLabel} (Sydney time).</p>
    <p><a href="${params.itemUrl}" style="color:#7A1B3D;">View item</a></p>
  `)
  const text = `Hi ${params.fullName}, ${params.itemTitle} closes at ${params.closingTimeLabel} (Sydney time).\n\n${params.itemUrl}`
  return { subject, html, text }
}

export function winnerNotificationEmail(params: {
  fullName: string
  itemTitles: string[]
  totalDueCents: number
  paymentUrl: string
}): RenderedEmail {
  const subject = `Congratulations — you won ${params.itemTitles.length} item${params.itemTitles.length === 1 ? '' : 's'}!`
  const list = params.itemTitles.map((t) => `<li>${t}</li>`).join('')
  const html = wrapHtml(`
    <h1 style="font-size:20px;color:#171717;">Congratulations, ${params.fullName}!</h1>
    <p>You won the following item${params.itemTitles.length === 1 ? '' : 's'}:</p>
    <ul>${list}</ul>
    <p>Total due: <strong>${centsToDisplay(params.totalDueCents)}</strong></p>
    <p><a href="${params.paymentUrl}" style="color:#7A1B3D;">Pay now</a></p>
  `)
  const text = `Congratulations, ${params.fullName}! You won: ${params.itemTitles.join(', ')}.\nTotal due: ${centsToDisplay(params.totalDueCents)}\nPay now: ${params.paymentUrl}`
  return { subject, html, text }
}

export function paymentRequestEmail(params: {
  fullName: string
  totalDueCents: number
  paymentUrl: string
}): RenderedEmail {
  const subject = `Payment due: ${centsToDisplay(params.totalDueCents)}`
  const html = wrapHtml(`
    <h1 style="font-size:20px;color:#171717;">Payment reminder</h1>
    <p>Hi ${params.fullName}, a payment of <strong>${centsToDisplay(params.totalDueCents)}</strong> is
    still due for your winning bids.</p>
    <p><a href="${params.paymentUrl}" style="color:#7A1B3D;">Pay now</a></p>
  `)
  const text = `Hi ${params.fullName}, a payment of ${centsToDisplay(params.totalDueCents)} is still due.\n\nPay now: ${params.paymentUrl}`
  return { subject, html, text }
}

export function paymentConfirmationEmail(params: {
  fullName: string
  itemTitles: string[]
  totalPaidCents: number
  receiptUrl?: string
}): RenderedEmail {
  const subject = `Payment received — thank you!`
  const list = params.itemTitles.map((t) => `<li>${t}</li>`).join('')
  const html = wrapHtml(`
    <h1 style="font-size:20px;color:#171717;">Thank you, ${params.fullName}!</h1>
    <p>We've received your payment of <strong>${centsToDisplay(params.totalPaidCents)}</strong> for:</p>
    <ul>${list}</ul>
    ${params.receiptUrl ? `<p><a href="${params.receiptUrl}" style="color:#7A1B3D;">View Stripe receipt</a></p>` : ''}
    <p>Thank you for supporting ${siteConfig.organisationName}.</p>
  `)
  const text = `Thank you, ${params.fullName}! We've received your payment of ${centsToDisplay(params.totalPaidCents)} for: ${params.itemTitles.join(', ')}.\n\nThank you for supporting ${siteConfig.organisationName}.`
  return { subject, html, text }
}
