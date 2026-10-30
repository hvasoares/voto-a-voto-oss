/**
 * The build gate of the fact records, as the finished site sees it (#61, #62, private#214). The pages already refuse to render a figure whose record fails
 * (`src/lib/facts/gate.ts`); this runs after the build and checks what was written: every calculation page is a stub with the data file it loads, every
 * record in the file has its inputs, its calculation, its source and the edition, the file carries the "conferido" seal, and every "ver cálculo" link of a
 * published page lands on a record that exists. A link to nothing, a stub without its file, or a record that lost its source fails the build. `verifyFactSite`
 * is pure (it reads through `read`), so the failing fixtures in `facts-gate.test.ts` run without a build.
 */
import type { AstroIntegration } from 'astro'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FactPageRecord } from '../src/lib/facts/page-record'
import { validatePageData } from '../src/shared/page-data'

/** `<a … href="/base/fato/rj/x/2026-1/#a">`: page path (under the base) and the fragment. */
const LINK = /<a class="calc" href="([^"]*?\/fato\/([^"#]+?)\/)#([^"]+)">/g
/** The data file of a calculation page: `data/v<fingerprint>/fato/<scope>/<page>.json`. */
const DATA_FILE = /^data\/v[0-9a-f]+\/fato\/(.+)\.json$/
const STUB_PATH = /data-page-path="([^"]+)"/

/**
 * `files`: every published file, as its path under the output directory (`rj/x/index.html`, `data/v…/fato/rj/x/2026-1.json`); `read` returns its text.
 * Returns one line per problem; empty when the site passes.
 */
export function verifyFactSite(files: readonly string[], read: (file: string) => string): string[] {
  const problems: string[] = []
  const stubs = files.filter((f) => f.startsWith('fato/') && f.endsWith('index.html'))
  const data = new Map<string, FactPageRecord>()
  for (const file of files) {
    const path = DATA_FILE.exec(file)?.[1]
    if (path === undefined) continue
    const check = validatePageData(JSON.parse(read(file)), { family: 'fato', path })
    if (!check.ok) problems.push(`${file}: ${check.error}`)
    else data.set(`fato/${path}/index.html`, check.file.data as FactPageRecord)
  }
  for (const file of stubs) {
    const stub = STUB_PATH.exec(read(file))?.[1]
    if (stub === undefined || `fato/${stub}/index.html` !== file) problems.push(`${file}: the stub does not name its data file`)
    if (!data.has(file)) problems.push(`${file}: no data file for the page`)
    if (!/data-stub-back/.test(read(file))) problems.push(`${file}: no link back`)
  }
  for (const [file, page] of data) {
    if (!stubs.includes(file)) problems.push(`${file}: a data file with no page`)
    if (page.facts.length === 0) problems.push(`${file}: no fact record in the page`)
    for (const f of page.facts) {
      if (!f.calculation?.formula || !f.calculation.worked?.length) problems.push(`${file}: ${f.id} shows no calculation`)
      if (!f.inputs) problems.push(`${file}: ${f.id} shows no inputs`)
      if (!f.source?.url) problems.push(`${file}: ${f.id} names no source`)
    }
    if (!page.edition?.id) problems.push(`${file}: no edition link`)
    if (!page.seal || page.seal.length === 0) problems.push(`${file}: no "conferido" seal`)
  }
  for (const file of files) {
    if (file.startsWith('fato/') || !file.endsWith('index.html')) continue
    for (const m of read(file).matchAll(LINK)) {
      const target = `fato/${m[2]}/index.html`
      const page = data.get(target)
      if (!stubs.includes(target)) problems.push(`${file}: "ver cálculo" goes to ${target}, which was not built`)
      else if (!page?.facts.some((f) => f.anchor === m[3])) problems.push(`${file}: "ver cálculo" goes to #${m[3]} of ${target}, which has no such record`)
    }
  }
  return problems
}

/** The pages (`index.html`) and the calculation pages' data files, as paths under the output folder. */
const walk = (dir: string, prefix = ''): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name), `${prefix}${e.name}/`) : e.name === 'index.html' || (prefix.startsWith('data/') && DATA_FILE.test(`${prefix}${e.name}`)) ? [`${prefix}${e.name}`] : [],
  )

export function factsGate(): AstroIntegration {
  return {
    name: 'voto-facts-gate',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const root = fileURLToPath(dir)
        if (!existsSync(join(root, 'fato'))) throw new Error('fact gate failed: the build wrote no /fato/ pages')
        const problems = verifyFactSite(walk(root), (f) => readFileSync(join(root, f), 'utf8'))
        if (problems.length > 0) throw new Error(`fact gate failed over ${root}: ${problems.length} problem(s)\n  - ${problems.slice(0, 40).join('\n  - ')}`)
      },
    },
  }
}
