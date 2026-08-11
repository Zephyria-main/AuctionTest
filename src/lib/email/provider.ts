export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
  /** Sets List-Unsubscribe headers; only used for optional/promotional mail. */
  unsubscribeUrl?: string
  /** Correlates provider-side logs with our outbox row, for support debugging. */
  tag?: string
}

export interface EmailSendResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

/**
 * Transactional email provider interface. Implement this for any provider
 * (Resend today; Postmark/SES/etc. later) without touching call sites.
 */
export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>
}
