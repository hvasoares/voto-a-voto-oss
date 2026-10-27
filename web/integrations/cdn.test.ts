import { describe, expect, it } from 'vitest'
import { CdnConfigError, resolveCdn, type CdnConfig } from './cdn'

const installed = { react: '19.3.1', 'react-dom': '19.3.1' }
const ok: CdnConfig = {
  approvedOrigins: ['https://cdn.example.test'],
  libraries: {
    react: { version: '19.3.1', url: 'https://cdn.example.test/react@19.3.1/index.js', integrity: 'sha384-AAAA' },
    'react-dom': { version: '19.3.1', url: 'https://cdn.example.test/react-dom@19.3.1/index.js', integrity: 'sha384-BBBB' },
  },
}

describe('resolveCdn', () => {
  it('is off for the empty default config, in every build target', () => {
    const empty: CdnConfig = { approvedOrigins: [], libraries: {} }
    expect(resolveCdn(empty, 'production', installed)).toBeUndefined()
    expect(resolveCdn(empty, 'local', installed)).toBeUndefined()
  })

  it('is off for local, test and screenshot builds even when configured: everything is bundled', () => {
    expect(resolveCdn(ok, 'local', installed)).toBeUndefined()
  })

  it('in production externalises the configured libraries and builds an import map with integrity', () => {
    const r = resolveCdn(ok, 'production', installed)!
    expect(r.externals).toEqual(['react', 'react-dom'])
    expect(r.importMap).toEqual({
      imports: { react: ok.libraries.react!.url, 'react-dom': ok.libraries['react-dom']!.url },
      integrity: { [ok.libraries.react!.url]: 'sha384-AAAA', [ok.libraries['react-dom']!.url]: 'sha384-BBBB' },
    })
  })

  it('refuses a library without an integrity hash', () => {
    const bad = structuredClone(ok)
    bad.libraries.react!.integrity = ''
    expect(() => resolveCdn(bad, 'production', installed)).toThrow(CdnConfigError)
  })

  it('refuses a URL whose origin is not approved', () => {
    const bad = structuredClone(ok)
    bad.libraries.react!.url = 'https://evil.example.test/react@19.3.1/index.js'
    expect(() => resolveCdn(bad, 'production', installed)).toThrow(/origin/)
  })

  it('refuses plain http except on loopback (test double)', () => {
    const bad = structuredClone(ok)
    bad.approvedOrigins = ['http://cdn.example.test']
    bad.libraries.react!.url = 'http://cdn.example.test/react@19.3.1/index.js'
    expect(() => resolveCdn(bad, 'production', installed)).toThrow(/https/)
  })

  it('refuses a version that is not the installed one (server and browser would run different Reacts) or not in the URL (not pinned)', () => {
    const a = structuredClone(ok)
    a.libraries.react!.version = '19.3.0'
    expect(() => resolveCdn(a, 'production', installed)).toThrow(/installed/)
    const b = structuredClone(ok)
    b.libraries.react!.url = 'https://cdn.example.test/react@latest/index.js'
    expect(() => resolveCdn(b, 'production', installed)).toThrow(/pinned/)
  })

  it('requires react and react-dom together so only one copy of React can run', () => {
    const lone = structuredClone(ok)
    delete lone.libraries['react-dom']
    expect(() => resolveCdn(lone, 'production', installed)).toThrow(/together/)
  })
})
