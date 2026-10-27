import { describe, expect, it } from 'vitest'
import { widgetSnippet, widgetSource, widgetUrl, WIDGET_HEIGHT } from './widget'

describe('the widget snippet', () => {
  it('is one iframe with the widget address, the full column width, a fixed height, no border and a title', () => {
    const url = widgetUrl('https://voto-a-voto.com', '/', 'rj', 'cidade-exemplo')
    expect(url).toBe('https://voto-a-voto.com/embed/rj/cidade-exemplo/')
    expect(widgetSnippet({ url, cityName: 'Cidade Exemplo' })).toBe(`<iframe src="https://voto-a-voto.com/embed/rj/cidade-exemplo/" width="100%" height="${WIDGET_HEIGHT}" style="border:0" title="Resultado de Cidade Exemplo"></iframe>`)
  })
  it('keeps the base path of a project-pages build', () => {
    expect(widgetUrl('https://hvasoares.github.io', '/voto-a-voto-oss/', 'sp', 'x')).toBe('https://hvasoares.github.io/voto-a-voto-oss/embed/sp/x/')
    expect(widgetUrl('https://x.br', 'sub', 'sp', 'x')).toBe('https://x.br/sub/embed/sp/x/')
  })
  it('escapes a name with quotes or markup so the snippet cannot be broken out of', () => {
    const s = widgetSnippet({ url: 'https://x.br/embed/rj/a/', cityName: 'D\'"<Oeste> & Cia' })
    expect(s).toContain('title="Resultado de D\'&quot;&lt;Oeste&gt; &amp; Cia"')
    expect(s.match(/</g)).toHaveLength(2)
  })
  it('asks for no script and no extra attribute: nothing of ours runs in the host', () => {
    expect(widgetSnippet({ url: 'https://x.br/embed/rj/a/', cityName: 'A' })).not.toMatch(/<script|allow=|sandbox|onload/)
  })
  it('states the source and the edition', () => {
    expect(widgetSource({ id: '2026-10-26', date: '2026-10-26' })).toBe('TSE · edição 26/10/2026')
    expect(widgetSource({ id: '2026-10-26-2', date: '2026-10-26' })).toBe('TSE · edição 26/10/2026 (2)')
  })
})
