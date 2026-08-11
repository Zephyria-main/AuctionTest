import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applyRehearsalGuardrails, isRehearsalMode } from '@/lib/email/rehearsal'

describe('rehearsal email guardrails', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('passes emails through unchanged outside rehearsal mode', () => {
    process.env.APP_ENV = 'production'
    const result = applyRehearsalGuardrails('winner@example.com', 'You won!')
    expect(result).toEqual({ to: 'winner@example.com', subject: 'You won!' })
  })

  it('redirects to the override address and labels the subject in rehearsal mode', () => {
    process.env.APP_ENV = 'rehearsal'
    process.env.REHEARSAL_EMAIL_OVERRIDE = 'rehearsal-catchall@example.test'
    const result = applyRehearsalGuardrails('real-bidder@example.com', 'You won!')
    expect(result.to).toBe('rehearsal-catchall@example.test')
    expect(result.subject).toContain('[REHEARSAL - TEST ONLY]')
  })

  it('refuses to send when rehearsal mode has no override configured', () => {
    process.env.APP_ENV = 'rehearsal'
    delete process.env.REHEARSAL_EMAIL_OVERRIDE
    expect(() => applyRehearsalGuardrails('real-bidder@example.com', 'You won!')).toThrow()
  })

  it('isRehearsalMode reflects APP_ENV', () => {
    process.env.APP_ENV = 'rehearsal'
    expect(isRehearsalMode()).toBe(true)
    process.env.APP_ENV = 'production'
    expect(isRehearsalMode()).toBe(false)
  })
})
