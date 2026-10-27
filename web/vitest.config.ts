import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { shardsModule } from './integrations/shards-fingerprint'

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: { alias: { '@': src('./src') } },
  plugins: [shardsModule()],
  test: { include: ['src/**/*.test.{ts,tsx}', 'integrations/**/*.test.ts', 'scripts/**/*.test.ts'], environment: 'node' },
})
