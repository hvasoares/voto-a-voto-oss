// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { atomFeed, citation, editionLabel, entryId, newestFirst, type Edition } from './editions'
import { loadEditions } from './editions-load'

const edition = (id: string, date = id.slice(0, 10), extra: Partial<Edition> = {}): Edition => ({
  schema_version: 1, id, date, fingerprint: 'abcdabcdabcdabcd',
  counts: { municipalities: 5571, overseas_posts: 186, municipalities_per_cycle: { '2026': 5571 }, rows: { 'votes.csv': 240981, 'turnout.csv': 34498 } },
  totals: {}, release: { identifier: `voto-a-voto-${id}`, license: 'CC-BY-4.0', url: '', files: {} }, notes: ['Dados finais do TSE & mais <nada>.'], files: {}, publication: { mode: 'manual', checks: [] }, ...extra,
})

describe('order and labels', () => {
  it('lists the newest edition first and breaks a same-day tie by the id', () => {
    const ids = newestFirst([edition('2026-10-20'), edition('2026-10-27'), edition('2026-10-27-2'), edition('2026-10-26')]).map((e) => e.id)
    expect(ids).toEqual(['2026-10-27-2', '2026-10-27', '2026-10-26', '2026-10-20'])
  })

  it('writes the date day first, with the number of a same-day edition', () => {
    expect(editionLabel(edition('2026-10-27'))).toBe('27/10/2026')
    expect(editionLabel(edition('2026-10-27-2'))).toBe('27/10/2026 (2)')
  })

  it('cites an edition by label, id and permanent address', () => {
    expect(citation(edition('2026-10-27'), 'https://voto-a-voto.com/edicoes/2026-10-27/')).toBe(
      'Voto a Voto. Resultados da eleição presidencial por município, edição de 27/10/2026 (2026-10-27). https://voto-a-voto.com/edicoes/2026-10-27/',
    )
  })
})

describe('the Atom feed', () => {
  const editions = [edition('2026-10-20'), edition('2026-10-27'), edition('2026-10-27-2', '2026-10-27', { publication: { mode: 'automatic', checks: [{ name: 'schema', ok: true, detail: '6 arquivos' }] } })]
  const xml = atomFeed(editions, { origin: 'https://voto-a-voto.com', base: '/' })
  const doc = new DOMParser().parseFromString(xml, 'application/xml')

  it('is well-formed Atom with the elements RFC 4287 requires', () => {
    const feed = doc.documentElement
    expect(feed.localName).toBe('feed')
    expect(feed.namespaceURI).toBe('http://www.w3.org/2005/Atom')
    const direct = (parent: Element, name: string) => [...parent.children].filter((c) => c.localName === name)
    for (const name of ['id', 'title', 'updated', 'author']) expect(direct(feed, name), `feed ${name}`).toHaveLength(1)
    expect(direct(feed, 'link').some((l) => l.getAttribute('rel') === 'self')).toBe(true)
    const entries = direct(feed, 'entry')
    expect(entries).toHaveLength(3)
    for (const entry of entries) {
      for (const name of ['id', 'title', 'updated', 'summary']) expect(direct(entry, name), `entry ${name}`).toHaveLength(1)
      expect(direct(entry, 'updated')[0]!.textContent).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    }
    const ids = entries.map((e) => direct(e, 'id')[0]!.textContent)
    expect(new Set(ids).size).toBe(3)
    expect(ids).toEqual([entryId('2026-10-27-2'), entryId('2026-10-27'), entryId('2026-10-20')])
  })

  it('lists every edition newest first, each linking its own address', () => {
    const hrefs = [...doc.querySelectorAll('entry > link[rel="alternate"]')].map((l) => l.getAttribute('href'))
    expect(hrefs).toEqual(['https://voto-a-voto.com/edicoes/2026-10-27-2/', 'https://voto-a-voto.com/edicoes/2026-10-27/', 'https://voto-a-voto.com/edicoes/2026-10-20/'])
    expect(doc.querySelector('feed > link[rel="alternate"]')!.getAttribute('href')).toBe('https://voto-a-voto.com/edicoes/')
    expect(doc.querySelector('feed > updated')!.textContent).toBe('2026-10-27T00:00:00Z')
  })

  it('carries the date, counts and notes, escaped, and the checks of an automatic publication', () => {
    const summaries = [...doc.querySelectorAll('entry > summary')].map((s) => s.textContent!)
    expect(summaries[0]).toContain('Publicada automaticamente após as verificações')
    expect(summaries[0]).toContain('passou: schema — 6 arquivos')
    expect(summaries[1]).toContain('5.571 municípios e 186 postos no exterior')
    expect(summaries[1]).toContain('Dados finais do TSE & mais <nada>.')
    expect(summaries[1]).not.toContain('Publicada automaticamente')
  })

  it('carries no analytics, script or image, and no address but the site', () => {
    expect(xml).not.toMatch(/<script|<img|<iframe|google|googletagmanager|gtag|\bsrc=/i)
    const addresses = [...xml.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!)
    expect(addresses.every((a) => a.startsWith('https://voto-a-voto.com/'))).toBe(true)
  })

  it('honours the base path in the addresses', () => {
    const projectSite = atomFeed([edition('2026-10-27')], { origin: 'https://x.github.io', base: '/voto-a-voto-oss/' })
    expect(projectSite).toContain('href="https://x.github.io/voto-a-voto-oss/edicoes/feed.atom"')
    expect(projectSite).toContain('href="https://x.github.io/voto-a-voto-oss/edicoes/2026-10-27/"')
  })
})

describe('the committed editions', () => {
  it('load newest first, and the real ones are described by their own data', () => {
    const real = loadEditions(resolve(import.meta.dirname, '../../../editions'))
    expect(real.length).toBeGreaterThan(0)
    for (const e of real) expect(JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../editions', e.id, 'edition.json'), 'utf8')).id).toBe(e.id)
    expect(loadEditions(resolve(import.meta.dirname, '../../fixtures/editions')).map((e) => e.id)).toEqual(['2026-10-26', '2026-10-20'])
  })
})
