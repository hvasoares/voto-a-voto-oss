/** Rebuild on change + serve. Simple: re-runs the full build (it takes well under a second on fixtures). */
import { watch } from 'node:fs'
import { buildSite } from './build'
import { startServer } from './serve'

let timer: NodeJS.Timeout | undefined
const rebuild = () => {
  clearTimeout(timer)
  timer = setTimeout(() => buildSite().then((r) => console.log(`rebuilt ${r.pages} pages`)).catch((e) => console.error(e)), 150)
}
await buildSite()
await startServer()
console.log(`dev: http://localhost:${process.env.PORT ?? 4173}${process.env.SITE_BASE ?? '/'}`)
for (const d of ['src', 'fixtures']) watch(d, { recursive: true }, rebuild)
