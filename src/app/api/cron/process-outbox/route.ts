import { NextResponse } from 'next/server'
import { isAuthorisedCronRequest } from '@/lib/cronAuth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getEmailProvider } from '@/lib/email/resendProvider'
import { applyRehearsalGuardrails } from '@/lib/email/rehearsal'
import { notifyAdmin } from '@/lib/email/adminAlert'
import { logger } from '@/lib/logger'
import * as templates from '@/lib/email/templates'
import { siteConfig } from '@/lib/config'
import type { RenderedEmail } from '@/lib/email/templates'

const BATCH_SIZE = 25
const MAX_ATTEMPTS = 5

type Payload = Record<string, unknown>

function render(templateKey: string, payload: Payload, recipient: { fullName: string; email: string }): RenderedEmail {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://[PLACEHOLDER-DOMAIN]'

  switch (templateKey) {
    case 'registration_confirmed':
      return templates.registrationConfirmedEmail({
        fullName: recipient.fullName,
        bidderNumber: Number(payload.bidderNumber),
      })
    case 'bid_confirmation':
      return templates.bidConfirmationEmail({
        fullName: recipient.fullName,
        itemTitle: String(payload.itemTitle),
        amountCents: Number(payload.amountCents),
        itemUrl: `${siteUrl}/items/${payload.itemId}`,
      })
    case 'outbid_notification':
      return templates.outbidNotificationEmail({
        fullName: recipient.fullName,
        itemTitle: String(payload.itemTitle),
        currentAmountCents: Number(payload.currentAmountCents),
        itemUrl: `${siteUrl}/items/${payload.itemId}`,
      })
    case 'closing_soon':
      return templates.closingSoonEmail({
        fullName: recipient.fullName,
        itemTitle: String(payload.itemTitle),
        closingTimeLabel: new Date(String(payload.closingTimeIso)).toLocaleString('en-AU', {
          timeZone: siteConfig.timeZone,
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        itemUrl: `${siteUrl}/items/${payload.itemId}`,
      })
    case 'winner_notification':
      return templates.winnerNotificationEmail({
        fullName: recipient.fullName,
        itemTitles: payload.itemTitles as string[],
        totalDueCents: Number(payload.totalDueCents),
        paymentUrl: `${siteUrl}/winner`,
      })
    case 'payment_request':
      return templates.paymentRequestEmail({
        fullName: recipient.fullName,
        totalDueCents: Number(payload.totalDueCents),
        paymentUrl: `${siteUrl}/winner`,
      })
    case 'payment_confirmation':
      return templates.paymentConfirmationEmail({
        fullName: recipient.fullName,
        itemTitles: payload.itemTitles as string[],
        totalPaidCents: Number(payload.totalPaidCents),
      })
    default:
      throw new Error(`Unknown template_key: ${templateKey}`)
  }
}

export async function GET(request: Request) {
  if (!isAuthorisedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createAdminSupabaseClient()
  const { data: jobs, error } = await admin
    .from('email_outbox')
    .select('id, template_key, recipient_bidder_id, payload, attempts')
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    logger.error('outbox_query_failed', { message: error.message })
    return NextResponse.json({ error: 'Failed to read outbox' }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  const provider = getEmailProvider()

  for (const job of jobs ?? []) {
    // Claim the job first (status stays 'pending' but attempts increments)
    // so a second, overlapping cron invocation won't send it twice.
    const { data: claimed } = await admin
      .from('email_outbox')
      .update({ attempts: job.attempts + 1 })
      .eq('id', job.id)
      .eq('attempts', job.attempts)
      .select('id')
      .maybeSingle()

    if (!claimed) continue // another worker already claimed this job

    try {
      const { data: recipient } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', job.recipient_bidder_id)
        .single()

      if (!recipient) throw new Error('Recipient profile not found')

      const rendered = render(job.template_key, job.payload as Payload, {
        fullName: recipient.full_name,
        email: recipient.email,
      })

      const { to, subject } = applyRehearsalGuardrails(recipient.email, rendered.subject)
      const result = await provider.send({ to, subject, html: rendered.html, text: rendered.text, tag: job.template_key })

      if (!result.success) throw new Error(result.error ?? 'Unknown send error')

      await admin
        .from('email_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
        .eq('id', job.id)
      sent += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      const nextAttempts = job.attempts + 1
      const permanentlyFailed = nextAttempts >= MAX_ATTEMPTS
      await admin
        .from('email_outbox')
        .update({
          status: permanentlyFailed ? 'failed' : 'pending',
          last_error: message,
        })
        .eq('id', job.id)
      failed += 1
      logger.warn('outbox_send_failed', { jobId: job.id, templateKey: job.template_key, attempts: nextAttempts, message })
      if (permanentlyFailed) {
        await notifyAdmin(
          'Email permanently failed to send',
          `Template "${job.template_key}" (outbox job ${job.id}) failed ${nextAttempts} times and will not be retried automatically. Last error: ${message}`
        )
      }
    }
  }

  return NextResponse.json({ processed: jobs?.length ?? 0, sent, failed })
}
