/**
 * The island list of the data-ready contract (#122), DERIVED from the pages: every component used with a
 * client directive (`client:load|idle|visible|media|interaction|panel|slot`) in an `src/**​/*.astro` page is a
 * hydrated island, and every hydrated island must say its readiness through the shared gate — its source must
 * contain `data-ready` and name the shared helper (`useIslandReady`, or `useMapView` which wraps it, built on `lib/island-ready`). An island
 * without both fails the run:
 *
 *     island <Component> (used in <page>) has no data-ready
 *
 * The only way out is EXEMPTIONS below, one line per island with the reason; an exemption that goes stale
 * (the island since said its readiness, or the island is gone) fails too, so the list stays the truth.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src')
const DIRECTIVE = /client:(load|idle|visible|media|interaction|panel|slot)/
const HELPER = /useIslandReady|useMapView|island-ready/

/**
 * Islands excused from the gate, and why. Keep it short: an entry means the island's readiness lives somewhere
 * else on purpose, and a failing entry is the signal to re-check that.
 */
const EXEMPTIONS: Record<string, string> = {
  RecapShare: 'a thin wrapper around ShareActions; the gate is the wrapped island\'s (data-share-actions).',
  StayHomeShare: 'a thin wrapper around ShareActions; the gate is the wrapped island\'s (data-share-actions).',
  MapaEnhancer: 'a 1 px sentinel: it enhances the server-drawn map of its panel; the readiness is the panel\'s (data-ready/data-drawn from lib/nerds).',
  DetalheEnhancer: 'a 1 px sentinel: it upgrades the server-drawn tables of its panel; the readiness is the panel\'s (data-ready/data-drawn from lib/nerds).',
  PanelActions: 'sentinel actions of the panels; the readiness is the panel\'s (data-ready/data-drawn from lib/nerds).',
}

/** `src/**​/*.astro` files, relative to the web root. */
const astroFiles = ((): string[] => {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.astro')) out.push(full)
    }
  }
  walk(SRC)
  return out.sort()
})()

/** One `import X from '...'` binding of an astro frontmatter script. */
const DEFAULT_IMPORT = /^import\s+([A-Z][A-Za-z0-9]*)\s+from\s+['"]([^'"]+)['"]/gm

/** Resolves an import path to a source file, the `@/` alias included. */
const resolveImport = (fromFile: string, spec: string): string | undefined => {
  const base = spec.startsWith('@/') ? resolve(SRC, spec.slice(2)) : resolve(dirname(fromFile), spec)
  for (const cand of [base, `${base}.tsx`, `${base}.ts`, `${base}.astro`, resolve(base, 'index.tsx'), resolve(base, 'index.ts')]) {
    if (existsSync(cand)) return cand
  }
  return undefined
}

interface IslandUse {
  component: string
  directive: string
  page: string
  source: string | undefined
}

/** Every `<Component ... client:...>` tag of every page, with the component's source resolved. */
const islands: IslandUse[] = astroFiles.flatMap((page) => {
  const text = readFileSync(page, 'utf8')
  const imports = new Map<string, string>()
  for (const m of text.matchAll(DEFAULT_IMPORT)) {
    const file = resolveImport(page, m[2]!)
    if (file) imports.set(m[1]!, file)
  }
  const out: IslandUse[] = []
  for (const m of text.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) {
    const end = text.indexOf('>', m.index)
    const tag = text.slice(m.index, end === -1 ? undefined : end + 1)
    const directive = tag.match(DIRECTIVE)?.[1]
    if (!directive) continue
    const file = imports.get(m[1]!)
    out.push({
      component: m[1]!,
      directive,
      page,
      source: file ? readFileSync(file, 'utf8') : undefined,
    })
  }
  return out
})

describe('every hydrated island says its readiness through the shared gate (#122)', () => {
  it('found the pages and the islands to check', () => {
    expect(astroFiles.length).toBeGreaterThan(0)
    expect(islands.length).toBeGreaterThan(0)
  })

  it('no island lacks data-ready and the shared helper, unless excused above', () => {
    const missing: string[] = []
    for (const island of islands) {
      if (island.component in EXEMPTIONS) continue
      const ok = !!island.source && /data-ready/.test(island.source) && HELPER.test(island.source)
      if (!ok) missing.push(`island ${island.component} (used in ${island.page.replace(SRC, 'src')}) has no data-ready`)
    }
    expect(missing).toEqual([])
  })

  it('every exemption is a live island without the gate (a stale exemption fails)', () => {
    const stale: string[] = []
    for (const name of Object.keys(EXEMPTIONS)) {
      const uses = islands.filter((i) => i.component === name)
      if (uses.length === 0) stale.push(`exemption ${name}: the component is no longer used with a client directive`)
      else if (uses.every((i) => i.source && /data-ready/.test(i.source) && HELPER.test(i.source)))
        stale.push(`exemption ${name}: the island now says data-ready through the shared helper - drop the exemption`)
    }
    expect(stale).toEqual([])
  })
})
