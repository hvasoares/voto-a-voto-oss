import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RULES } from './shared/type-guard-rules'

/*
 * The docs name things the code must still have (#130). Two checks, both proven able to fail by a seeded bad string:
 *  (a) every `src/pages/...` path written in backticks in web/docs/*.md and web/README.md exists on disk;
 *  (b) web/README.md names none of the typography the type scale forbids (the same RULES type-guard.test.ts enforces).
 */
const WEB = join(__dirname, '..')
const DOCS = [join(WEB, 'README.md'), ...readdirSync(join(WEB, 'docs')).filter((n) => n.endsWith('.md')).map((n) => join(WEB, 'docs', n))]

export function missingPagePaths(text: string, exists: (path: string) => boolean): string[] {
  const named = [...text.matchAll(/`(src\/pages\/[^`\s]*)`/g)].map(([, path]) => path as string)
  return named.filter((p) => !exists(join(WEB, p)))
}

export function forbiddenTypography(text: string): string[] {
  return RULES.flatMap(({ what, re }) => text.split('\n').filter((line) => re.test(line)).map((line) => `${what}: ${line.trim().slice(0, 100)}`))
}

describe('docs name real things (#130)', () => {
  it('every src/pages path in backticks exists on disk', () => {
    const missing = DOCS.flatMap((doc) => missingPagePaths(readFileSync(doc, 'utf8'), existsSync).map((p) => `${doc.slice(WEB.length + 1)}: ${p}`))
    expect(missing).toEqual([])
  })

  it('the path check fails on a page that does not exist', () => {
    expect(missingPagePaths('see `src/pages/fato/[uf]/[slug]/[page]/` here', () => false)).toEqual(['src/pages/fato/[uf]/[slug]/[page]/'])
    expect(missingPagePaths('see `src/pages/fato/[...path]/index.astro`', () => true)).toEqual([])
  })

  it('README.md names no forbidden Tailwind size or weight', () => {
    expect(forbiddenTypography(readFileSync(join(WEB, 'README.md'), 'utf8'))).toEqual([])
  })

  it('the typography check fails on a seeded forbidden name', () => {
    expect(forbiddenTypography('utilities (text-title, font-serif)')).not.toEqual([])
    expect(forbiddenTypography('the scale is text-step-2')).toEqual([])
  })
})
