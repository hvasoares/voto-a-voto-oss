/**
 * A published sentence is written in the catalog (`catalog.ts`) and nowhere else. Two guards:
 *  1. no source file outside the catalog repeats a catalog template (a copy would drift and escape review);
 *  2. the modules that build the city card's sentences (the card panel, the headline, the share text and model) contain
 *     no sentence-like string literal of their own: they only fill catalog templates.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG } from './catalog'

const SRC = join(import.meta.dirname, '..', '..')
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|astro)$/.test(f) && !/\.test\./.test(f) ? [p] : []
  })
const sources = files(SRC).filter((p) => !p.endsWith(join('sentences', 'catalog.ts')))
const text = new Map(sources.map((p) => [relative(SRC, p), readFileSync(p, 'utf8')]))
/** Code without its comments (a comment may quote a sentence to explain it). */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

/** The static stretches of a template (between its `{slots}`) that are long enough to be telling. */
const fragments = (tpl: string) => tpl.split(/\{\w+\}/).map((s) => s.trim()).filter((s) => s.length >= 14 && (s.match(/\p{L}{2,}/gu) ?? []).length >= 4)

describe('sentences outside the catalog', () => {
  const templates = Object.values(CATALOG['pt-BR']).flatMap((messages) => Object.values(messages as Record<string, string>))

  it('has templates to compare with', () => {
    expect(templates.flatMap(fragments).length).toBeGreaterThan(20)
  })

  it('no source file repeats a catalog template', () => {
    const copies = templates.flatMap(fragments).flatMap((frag) => [...text].filter(([, src]) => code(src).includes(frag)).map(([file]) => `${file}: "${frag}"`))
    expect(copies).toEqual([])
  })

  const BUILDERS = ['slots/city/card.ts', 'lib/sentences/headline.ts', 'lib/sentences/margin.ts', 'lib/sentences/arc.ts', 'slots/city/curiosities.ts', 'lib/share-text.ts', 'lib/share-model.ts', 'scripts/city-card.ts', 'lib/sentences/register-store.ts', 'lib/sentences/stat.ts', 'lib/sentences/recap.ts', 'lib/stat-card.ts', 'lib/stat-content.ts', 'lib/recap-card.ts', 'lib/recap-content.ts', 'lib/card-keys.ts']
  const WORDS = /\b(de|do|da|dos|das|o|a|os|as|que|em|no|na|não|e|com|para|por|um|uma)\b/i
  const literals = (src: string) => [...src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '')

  it.each(BUILDERS)('%s has no sentence of its own', (file) => {
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
})
