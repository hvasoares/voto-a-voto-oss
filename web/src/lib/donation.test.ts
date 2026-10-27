import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { donationUrl } from './donation'

describe('the donation address', () => {
  it.each([[undefined], [''], ['   '], [null]])('is not there when nothing is configured (%j)', (value) => {
    expect(donationUrl({ PUBLIC_DONATION_URL: value as string | undefined })).toBeUndefined()
  })

  it('is the configured https address, trimmed', () => {
    expect(donationUrl({ PUBLIC_DONATION_URL: '  https://apoia.example.org/voto-a-voto  ' })).toBe('https://apoia.example.org/voto-a-voto')
  })

  it.each([
    ['plain http', 'http://apoia.example.org/x'],
    ['a script', 'javascript:alert(1)'],
    ['a data url', 'data:text/html,x'],
    ['not an address', 'apoia ponto org'],
    ['a relative path', '/doar'],
    ['credentials in the address', 'https://user:pass@apoia.example.org/'],
  ])('is not accepted: %s, so no link is shown and nothing invented takes its place', (_name, value) => {
    expect(donationUrl({ PUBLIC_DONATION_URL: value })).toBeUndefined()
  })
})

describe('no ad network anywhere on the site', () => {
  // The site's own source and the public files: no ad network script, tag or domain.
  const AD_NETWORKS = /doubleclick|googlesyndication|adsbygoogle|adservice\.google|pagead|taboola|outbrain|amazon-adsystem|criteo|adnxs|ads-twitter|connect\.facebook\.net|fbevents|tiktok\.com\/i18n|hotjar|clarity\.ms/i
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (name === 'node_modules' || name === 'data' || name === 'geo' || name === 'preview') return []
      return statSync(path).isDirectory() ? walk(path) : [path]
    })
  const root = resolve(import.meta.dirname, '../..')

  it('names none in src/, integrations/ or public/ (the donation test itself excepted)', () => {
    const files = [...walk(join(root, 'src')), ...walk(join(root, 'integrations')), ...walk(join(root, 'public'))].filter((f) => /\.(ts|tsx|astro|js|css|html|json|txt)$/.test(f) && !f.endsWith('donation.test.ts'))
    expect(files.length).toBeGreaterThan(50)
    const hits = files.filter((f) => AD_NETWORKS.test(readFileSync(f, 'utf8')))
    expect(hits).toEqual([])
  })
})
