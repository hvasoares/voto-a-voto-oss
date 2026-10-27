import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: { alias: { '@site': src('../site/src'), '@': src('./src') } },
  test: { include: ['src/**/*.test.{ts,tsx}', 'integrations/**/*.test.ts', 'scripts/**/*.test.ts'], environment: 'node' },
})
