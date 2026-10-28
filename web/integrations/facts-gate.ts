/**
 * The build gate of the fact records, as the finished site sees it (#61, #62). The pages already refuse to render a figure whose record fails
 * (`src/lib/facts/gate.ts`); this runs after the build and checks what was written: every record has its page, with its
 * source, its calculation and the edition, and every "ver cálculo" link of a published page lands on a record that exists. A link
 * to nothing, or a record page that lost its source, fails the build. `verifyFactSite` is pure (it reads through `read`), so the
 * failing fixtures in `facts-gate.test.ts` run without a build.
 */
import type { AstroIntegration } from 'astro'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** `<a … href="/base/fato/rj/x/2026-1/#a">`: page path (under the base) and the fragment. */
const LINK = /<a class="calc" href="([^"]*?\/fato\/([^"#]+?)\/)#([^"]+)">/g

/**
 * `files`: every published HTML page, as its path under the output directory (`rj/x/index.html`); `read` returns its text.
 * Returns one line per problem; empty when the site passes.
 */
export function verifyFactSite(files: readonly string[], read: (file: string) => string): string[] {
  const problems: string[] = []
  const pages = new Map(files.filter((f) => f.startsWith('fato/')).map((f) => [f, read(f)]))
  for (const [file, text] of pages) {
    if (!/data-fact="[^"]+"/.test(text)) problems.push(`${file}: no fact record in the page`)
    for (const section of text.split('<section class="fact"').slice(1)) {
      const id = /data-fact="([^"]+)"/.exec(section)?.[1] ?? '(no id)'
      if (!/class="fact__formula"/.test(section) || !/class="fact__worked"/.test(section)) problems.push(`${file}: ${id} shows no calculation`)
      if (!/class="fact__inputs"/.test(section)) problems.push(`${file}: ${id} shows no inputs`)
    }
    if (!/<a href="[^"]*dados\.json|https:\/\/dadosabertos\.tse\.jus\.br\//.test(text)) problems.push(`${file}: no source link`)
    if (!/data-edition-link/.test(text)) problems.push(`${file}: no edition link`)
    if (!/data-seal/.test(text)) problems.push(`${file}: no "conferido" seal`)
  }
  for (const file of files) {
    if (file.startsWith('fato/') || !file.endsWith('index.html')) continue
    for (const m of read(file).matchAll(LINK)) {
      const target = `fato/${m[2]}/index.html`
      const page = pages.get(target)
      if (page === undefined) problems.push(`${file}: "ver cálculo" goes to ${target}, which was not built`)
      else if (!page.includes(`id="${m[3]}"`)) problems.push(`${file}: "ver cálculo" goes to #${m[3]} of ${target}, which has no such record`)
    }
  }
  return problems
}

const walk = (dir: string, prefix = ''): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name), `${prefix}${e.name}/`) : e.name === 'index.html' ? [`${prefix}${e.name}`] : []))

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
