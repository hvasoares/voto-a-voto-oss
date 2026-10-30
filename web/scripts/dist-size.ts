/**
 * `npm run check:dist-size` (private#204): the size of the built site by page family, with a budget.
 * It builds nothing: it reads the folder it is given (default `web/dist`, or `OUT_DIR`, or argv[2]), prints the table,
 * the file count and the cost of one more edition, and exits 1 above `DIST_BUDGET_BYTES` (`dist-size-budget.ts`).
 * Run after a build: `npm run build && npm run check:dist-size`. The pure part is `dist-size-judge.ts`.
 */
import { statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DIST_BUDGET_BYTES, RECOMMENDED_FINAL_BYTES } from './dist-size-budget'
import { editionCost, judgeBudget, renderEditionCost, renderTable, summarize, type BuiltFile } from './dist-size-judge'
import { walkFiles } from './walk'

const here = dirname(fileURLToPath(import.meta.url))

/** The thin read: every file under `dir` as (path relative to it, bytes). Throws when the folder is not built. */
export function readDist(dir: string): BuiltFile[] {
  try {
    if (!statSync(dir).isDirectory()) throw new Error()
  } catch {
    throw new Error(`dist not found: ${dir} (run \`npm run build\` first; check:dist-size builds nothing)`)
  }
  return walkFiles(dir).map((p) => ({ path: relative(dir, p).split('\\').join('/'), bytes: statSync(p).size }))
}

function main(dir: string): void {
  const files = readDist(dir)
  const summary = summarize(files)
  const verdict = judgeBudget(summary.total.bytes, DIST_BUDGET_BYTES)
  const data = summary.rows.find((r) => r.family === 'data-shards')
  console.log(`${renderTable(summary)}\n`)
  console.log(`files: ${summary.total.files.toLocaleString('en-US')} in total, ${(data?.files ?? 0).toLocaleString('en-US')} of them data files (family data-shards)`)
  console.log(`${renderEditionCost(editionCost(files), summary.total.bytes, DIST_BUDGET_BYTES, RECOMMENDED_FINAL_BYTES)}\n`)
  console.log(verdict.message)
  if (!verdict.ok) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(resolve(process.argv[2] ?? process.env.OUT_DIR ?? resolve(here, '..', 'dist')))
