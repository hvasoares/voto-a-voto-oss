/** Static server that behaves like GitHub Pages (reuses site/scripts/serve.ts): /x -> 301 /x/, 404.html for misses, SITE_BASE honoured. */
import { resolve } from 'node:path'
import { startServer } from '../../site/scripts/serve'
import { normalizeBase } from '../../site/src/paths'

const port = Number(process.env.PORT ?? 4173)
const base = normalizeBase(process.env.SITE_BASE)
await startServer(resolve(process.env.OUT_DIR ?? 'dist'), port, base)
console.log(`serving dist on http://localhost:${port}${base}`)
