import 'server-only'
import { getEmailProvider } from './resendProvider'
import { logger } from '@/lib/logger'

/**
 * Sends a direct, immediate alert to the administrator notification
 * address (not via the outbox — this is operational alerting, not a
 * bidder-facing transactional email). Used for conditions that need a
 * human promptly: webhook processing errors, emails that exhausted retries.
 */
export async function notifyAdmin(subject: string, message: string) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL
  if (!to) {
    logger.warn('admin_alert_skipped_no_recipient', { subject })
    return
  }
  try {
    const provider = getEmailProvider()
    await provider.send({
      to,
      subject: `[ABCF Auction Alert] ${subject}`,
      html: `<p>${message}</p>`,
      text: message,
      tag: 'admin_alert',
    })
  } catch (err) {
    logger.error('admin_alert_send_failed', { message: err instanceof Error ? err.message : 'unknown' })
  }
}
