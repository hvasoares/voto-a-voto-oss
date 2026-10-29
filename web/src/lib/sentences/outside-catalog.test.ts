/**
 * A published sentence is written in the catalog (`catalog.ts` and the `catalog-*.ts` files that register into it)
 * and nowhere else. Two guards:
 *  1. no source file outside the catalog repeats a catalog template (a copy would drift and escape review);
 *  2. a builder — a module that fills catalog templates — contains no sentence-like string literal of its own:
 *     it only fills catalog templates.
 *
 * The lists of both guards are derived, never kept by hand (#111):
 *
 *  - `classify(path, source)` sorts every non-test source file:
 *      * `catalog`: the path matches `lib/sentences/catalog(-<name>)?.ts` — these files ARE the catalog (data,
 *        not sentences of their own), so both guards skip them;
 *      * `builder`: the file's imports resolve into `lib/sentences/` — the catalog itself, a `catalog-*` file
 *        (importing `message(`/`template(` from it or importing it for the registration side effect) or any other
 *        sentences module. Detection by import covers the files that fill templates. A builder that copies a
 *        sentence WITHOUT importing the catalog cannot be found this way; that case is covered by guard 1, which
 *        scans every source file for template fragments, so the two guards together close it;
 *      * `other`: everything else (pages, UI labels, aria text).
 *  - registration is derived the same way: every `lib/sentences/catalog-*.ts` on disk is imported below for its
 *    side effect, so adding a catalog file or a builder means no edit here. One exception, by design:
 *    `catalog-question.ts` and `catalog-guess.ts` are DATA ONLY (their headers explain: the browser scripts read
 *    them directly and must not pull the catalog into the page), so their owning module registers them "for the
 *    build and the tests" — the `../question` import below is that registration. `catalog-replay.ts` is likewise
 *    data-only and is read through `lib/replay.ts`; its words enter no copy-check corpus, today as before.
 *
 * Convention for new code: a feature's sentences go in `lib/sentences/catalog-<feature>.ts`; a builder imports the
 * catalog or another sentences module and fills templates. Nothing is registered or listed by hand.
 *
 * The builder rule over-approximates on purpose: a component that imports the catalog only for a label still
 * classifies as `builder` and can fail guard 2 on a legitimate literal. When that happens the file goes in
 * `ALLOWED_LITERALS` with the reason — the sentence heuristic is never loosened for one file.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { walkFiles } from '../../../scripts/walk'
import { CATALOG } from './catalog'

const SRC = join(import.meta.dirname, '..', '..')
const files = (dir: string): string[] => walkFiles(dir).filter((p) => /\.(ts|tsx|astro)$/.test(p) && !/\.test\./.test(p))
const text = new Map(files(SRC).map((p) => [relative(SRC, p).split(sep).join('/'), readFileSync(p, 'utf8')]))
/** Code without its comments (a comment may quote a sentence to explain it). */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

/** The static stretches of a template (between its `{slots}`) that are long enough to be telling. */
const fragments = (tpl: string) => tpl.split(/\{\w+\}/).map((s) => s.trim()).filter((s) => s.length >= 14 && (s.match(/\p{L}{2,}/gu) ?? []).length >= 4)

const CATALOG_PATH = /^lib\/sentences\/catalog(-[\w-]+)?\.ts$/
const SENTENCES_MODULE = /^lib\/sentences\/[\w-]+$/
/** Import specifiers: `import ... from 'x'`, `export ... from 'x'` and bare `import 'x'` (side-effect imports). */
const importSpecs = (src: string): string[] => [...src.matchAll(/\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm)].map((m) => m[1] ?? m[2] ?? '')

/** Resolves an import specifier to a src-relative module path, or null for package imports. */
const resolveSpec = (from: string, spec: string): string | null => {
  const p = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? posix.normalize(posix.join(posix.dirname(from), spec)) : null
  return p?.replace(/\.(ts|tsx|astro|js|mjs)$/, '') ?? null
}

/** Pure (see the header): how a source file relates to the catalog. */
const classify = (path: string, source: string): 'catalog' | 'builder' | 'other' => {
  if (CATALOG_PATH.test(path)) return 'catalog'
  const fills = importSpecs(source).some((spec) => {
    const resolved = resolveSpec(path, spec)
    return resolved !== null && SENTENCES_MODULE.test(resolved)
  })
  return fills ? 'builder' : 'other'
}

const catalogs = [...text.keys()].filter((p) => CATALOG_PATH.test(p)).sort()
const builders = [...text].filter(([p, src]) => classify(p, code(src)) === 'builder').map(([p]) => p).sort()

/** Every `lib/sentences/catalog-*.ts` on disk (equals the walker's `catalogs`; `catalog.ts` defines CATALOG). */
const catalogFiles = readdirSync(import.meta.dirname).filter((f) => /^catalog(-[\w-]+)?\.ts$/.test(f)).sort()
await Promise.all(catalogFiles.filter((f) => f !== 'catalog.ts').map((f) => import(`./${f}`)))
// The data-only catalogs (see the header): their owner registers them "for the build and the tests".
await import('../question')

describe('sentences outside the catalog', () => {
  const templates = Object.values(CATALOG['pt-BR']).flatMap((messages) => Object.values(messages as Record<string, string>))

  it('the derived lists did not silently shrink', () => {
    expect(catalogs.length, `found ${catalogs.length} catalogs, expected at least 16`).toBeGreaterThanOrEqual(16)
    expect(builders.length, `found ${builders.length} builders, expected at least 56`).toBeGreaterThanOrEqual(56)
    expect(templates.length, `found ${templates.length} templates, expected at least 1367 (the pre-#111 1227 plus catalog-game's 140)`).toBeGreaterThanOrEqual(1367)
  })

  it('every catalog file on disk is imported (adding one needs no edit here)', () => {
    expect(catalogs).toEqual(catalogFiles.map((f) => `lib/sentences/${f}`))
  })

  it('has templates to compare with', () => {
    expect(templates.flatMap(fragments).length).toBeGreaterThan(20)
  })

  /**
   * Template fragments whose existing copies the derivation newly exposed (guard 1 scans every file, so importing
   * catalog-game turned `game.source` into a template the whole site already carried). One line per fragment, WITH
   * the reason; the follow-up that centralizes the copy removes the entry, and a stale fragment fails the assertion
   * below instead of exempting nothing.
   */
  const KNOWN_COPIES: ReadonlyMap<string, string> = new Map([
    ['Fonte: TSE, dados finais', 'page footers and the nerds card wrote this source note by hand long before catalog-game registered game.source; centralizing the note in one shared layout is wording work of its own, listed in the #111 PR'],
  ])
  it('every known copy still names a live fragment', () => {
    const live = new Set(templates.flatMap(fragments))
    expect([...KNOWN_COPIES.keys()].filter((f) => !live.has(f))).toEqual([])
  })

  it('no source file repeats a catalog template', () => {
    const copies = templates
      .flatMap(fragments)
      .filter((frag) => !KNOWN_COPIES.has(frag))
      .flatMap((frag) => [...text].filter(([file, src]) => !CATALOG_PATH.test(file) && code(src).includes(frag)).map(([file]) => `${file}: "${frag}"`))
    expect(copies).toEqual([])
  })

  /**
   * Builders whose own literals are legitimate — one line per file, WITH the reason (see the header). Reviewed once
   * in the PR that derived the lists; the heuristic is not edited for any of them. Every key must name a derived
   * builder, asserted below, so a stale entry fails instead of silently exempting nothing.
   */
  const ALLOWED_LITERALS: ReadonlyMap<string, string> = new Map([
    ['components/BrasilScreen.astro', "the bar chart's aria-label is accessibility text, not a card sentence"],
    ['components/CardGenerator.tsx', 'the download/share toast messages are generator island UI, not card sentences'],
    ['components/CityCard.astro', 'the fixture banner and the card-links aria-label are page chrome'],
    ['components/MeuBrasil.tsx', 'the load-failure notice is island UI chrome'],
    ['components/MeuBrasilSticker.tsx', 'the load-failure notice is island UI chrome'],
    ['components/ShareSheet.tsx', 'the note on how sharing works is sheet UI chrome'],
    ['components/StayHomePage.astro', 'the document title and the map iframe title are page chrome'],
    ['lib/facts/other.ts', 'report page titles are headings, not card sentences'],
    ['lib/facts/pages.ts', 'report page titles are headings and the Error strings are build-time invariants'],
    ['lib/game.ts', 'the RangeError message is a build-time invariant, never rendered'],
    ['lib/generator-model.ts', 'the download and size labels are generator UI labels'],
    ['lib/link-preview.ts', 'the og:title suffix is document metadata'],
    ['pages/[uf]/resumo/index.astro', 'the fixture demo note is page chrome'],
    ['pages/brasil/compartilhar/index.astro', 'the document title and the fixture demo note are page chrome'],
    ['pages/cara-a-cara/index.astro', 'the fixture demo note is page chrome'],
    ['pages/compartilhar.astro', 'the share note and the fixture demo note are page chrome'],
    ['pages/embed/[uf]/[slug]/index.astro', 'the embed document title is document metadata'],
    ['pages/fato/[...path]/index.astro', 'the fixture banner is page chrome'],
    ['pages/meu-brasil/adesivo/index.astro', 'the fixture demo note is page chrome'],
    ['pages/meu-brasil/index.astro', 'the fixture demo note is page chrome'],
    ['pages/relatorios/como-cada-grupo-votou/index.astro', 'the fixture banner, the footnote and the document title are page chrome'],
    ['pages/tres-ciclos/[uf]/index.astro', 'the document title, the chart summary aria-label and the nav label are page chrome'],
  ])
  const guardedBuilders = builders.filter((b) => !ALLOWED_LITERALS.has(b))

  it('every allow-list entry names a derived builder', () => {
    expect([...ALLOWED_LITERALS.keys()].filter((f) => !builders.includes(f))).toEqual([])
  })

  const WORDS = /\b(de|do|da|dos|das|o|a|os|as|que|em|no|na|não|e|com|para|por|um|uma)\b/i
  const literals = (src: string) => [...src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '')

  it.each(guardedBuilders)('%s has no sentence of its own', (file) => {
    const src = text.get(file)
    expect(src, `${file} exists`).toBeDefined()
    const sentences = literals(code(src!))
      .filter((s) => !/^(@|\.|\/)|<|=|\$\{/.test(s.trim()) || /^[A-ZÀ-Ú][^<>=]*\s/.test(s))
      .filter((s) => s.trim().split(/\s+/).length >= 4 && WORDS.test(s) && /[a-zà-ú]{3}/i.test(s))
    expect(sentences).toEqual([])
  })

  it('the guard itself notices a sentence', () => {
    expect(literals(`const x = 'Em Cidade, o resultado não saiu'`).filter((s) => s.split(/\s+/).length >= 4 && WORDS.test(s))).toHaveLength(1)
  })

  describe('classify derives the lists', () => {
    it('a catalog file is a catalog whatever it contains', () => {
      expect(classify('lib/sentences/catalog.ts', '')).toBe('catalog')
      expect(classify('lib/sentences/catalog-x.ts', "import { CATALOG } from './catalog'")).toBe('catalog')
    })

    it('a file that imports the catalog or another sentences module is a builder', () => {
      expect(classify('lib/example.ts', "import { message } from './sentences/catalog'")).toBe('builder')
      expect(classify('lib/example.ts', "import './sentences/catalog-x'")).toBe('builder')
      expect(classify('components/Example.tsx', "import { message } from '@/lib/sentences/catalog'")).toBe('builder')
      expect(classify('lib/example.ts', "import { headline } from './sentences/headline'")).toBe('builder')
      expect(classify('lib/sentences/example.ts', "import { message } from './catalog'")).toBe('builder')
    })

    it('a UI component with a short label and no catalog import is other and not flagged', () => {
      const src = "export const Badge = () => <span>Fim</span>"
      expect(classify('components/Badge.tsx', src)).toBe('other')
    })

    it('a catalog import inside a comment does not classify', () => {
      const src = "// import { message } from '@/lib/sentences/catalog'\nexport const x = 1"
      expect(classify('lib/example.ts', code(src))).toBe('other')
    })

    it('a sentence-like literal in a builder source is found, one in a comment is not', () => {
      const found = "import { message } from './sentences/catalog'\nconst x = 'Em Cidade, o resultado não saiu'"
      expect(classify('lib/example.ts', code(found))).toBe('builder')
      expect(literals(code(found)).filter((s) => s.split(/\s+/).length >= 4 && WORDS.test(s))).toHaveLength(1)
      const commented = "import { message } from './sentences/catalog'\n// const x = 'Em Cidade, o resultado não saiu'"
      expect(literals(code(commented)).filter((s) => s.split(/\s+/).length >= 4 && WORDS.test(s))).toHaveLength(0)
    })

    it('a new catalog file and the file importing it derive without any edit (in-memory listing)', () => {
      const probe = 'lib/sentences/catalog-zz-probe.ts'
      const listing = new Map(text)
      listing.set(probe, "import { CATALOG } from './catalog'\nObject.assign(CATALOG['pt-BR'].standard, {})")
      listing.set('lib/probe-view.ts', "import { message } from './sentences/catalog-zz-probe'\nexport const t = message('game.title')")
      expect([...listing.keys()].filter((p) => CATALOG_PATH.test(p))).toHaveLength(catalogs.length + 1)
      expect(classify(probe, code(listing.get(probe)!))).toBe('catalog')
      expect(classify('lib/probe-view.ts', code(listing.get('lib/probe-view.ts')!))).toBe('builder')
    })
  })
})
