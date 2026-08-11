import 'server-only'
import { Resend } from 'resend'
import type { EmailMessage, EmailProvider, EmailSendResult } from './provider'

/**
 * Resend implementation of EmailProvider. Sender/reply-to addresses are
 * configured entirely through environment variables (see .env.example) —
 * never hardcoded — so rehearsal and production can use different,
 * clearly labelled addresses.
 */
export class ResendEmailProvider implements EmailProvider {
  private client: Resend
  private fromAddress: string
  private replyToAddress: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    const fromAddress = process.env.EMAIL_FROM_ADDRESS
    const replyToAddress = process.env.EMAIL_REPLY_TO_ADDRESS

    if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
    if (!fromAddress) throw new Error('EMAIL_FROM_ADDRESS is not configured')
    if (!replyToAddress) throw new Error('EMAIL_REPLY_TO_ADDRESS is not configured')

    this.client = new Resend(apiKey)
    this.fromAddress = fromAddress
    this.replyToAddress = replyToAddress
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const headers: Record<string, string> = {}
      if (message.unsubscribeUrl) {
        headers['List-Unsubscribe'] = `<${message.unsubscribeUrl}>`
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
      }

      const result = await this.client.emails.send({
        from: this.fromAddress,
        to: message.to,
        replyTo: this.replyToAddress,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: Object.keys(headers).length ? headers : undefined,
        tags: message.tag ? [{ name: 'category', value: message.tag }] : undefined,
      })

      if (result.error) {
        return { success: false, error: result.error.message }
      }
      return { success: true, providerMessageId: result.data?.id }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown email error' }
    }
  }
}

export function getEmailProvider(): EmailProvider {
  return new ResendEmailProvider()
}
