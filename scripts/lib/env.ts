import { config } from 'dotenv'
import { existsSync } from 'node:fs'

// Load .env.local if present (local/rehearsal use), otherwise rely on
// whatever environment variables the shell/CI already has set.
if (existsSync('.env.local')) {
  config({ path: '.env.local' })
} else {
  config()
}

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return value
}

/**
 * Refuses to run against production unless explicitly overridden. Both
 * scripts in this directory create or delete large amounts of bidder/bid
 * data and must never touch a live event by accident.
 */
export function assertNotProduction() {
  const appEnv = process.env.APP_ENV ?? 'development'
  if (appEnv === 'production' && process.env.I_UNDERSTAND_THIS_TARGETS_PRODUCTION !== 'true') {
    console.error(
      'Refusing to run: APP_ENV=production. If you really intend to run this against production,\n' +
        're-run with I_UNDERSTAND_THIS_TARGETS_PRODUCTION=true set explicitly.'
    )
    process.exit(1)
  }
}
