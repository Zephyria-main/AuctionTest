import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // The `server-only` package is a Next.js bundler stub, not a real
      // module — no-op it for tests run directly under Node/Vitest.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
})
