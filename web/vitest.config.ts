import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { shardsModule } from './integrations/shards-fingerprint'

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: { alias: { '@': src('./src'), 'virtual:fact-words': src('./src/test/fact-words-empty.ts') } },
  plugins: [shardsModule()],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'integrations/**/*.test.ts', 'scripts/**/*.test.ts', 'e2e/**/*.test.ts'],
    // Component tests render .astro files and need Astro's own plugins: vitest.astro.config.ts runs them (ticket #136).
    exclude: ['**/node_modules/**', 'src/**/*.astro.test.ts'],
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
