/**
 * Component tests of the page shell (ticket #136): each shell component rendered with its props through Astro's container, the markup
 * compared with what the pages wrote by hand before. The pure halves (`shared/page-shell.ts`, `shared/fixture-banner.ts`) have their own
 * test; this file proves the components wire them in the right order. Runs with `vitest.astro.config.ts` (`npm run test:components`).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { beforeAll, describe, expect, it } from 'vitest'
import AppHeader from './AppHeader.astro'
import DocHead from './DocHead.astro'
import FixtureBanner from './FixtureBanner.astro'
import PageMain from './PageMain.astro'

let container: Awaited<ReturnType<typeof AstroContainer.create>>
beforeAll(async () => {
  container = await AstroContainer.create()
})

describe('AppHeader', () => {
  it('draws the wordmark, the divider and the scope', async () => {
    const html = await container.renderToString(AppHeader)
    expect(html).toContain('<header class="app-header">')
    expect(html).toMatch(/<a class="brand" href="[^"]*">Voto a Voto<\/a>/)
    expect(html).toContain('<span class="app-header__sep" aria-hidden="true"></span>')
    expect(html).toContain('<span class="app-header__context">Presidente 2026</span>')
  })
})

describe('FixtureBanner', () => {
  const NARROW = 'EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS'

  it('draws nothing when the data is not a fixture', async () => {
    expect((await container.renderToString(FixtureBanner, { props: { show: false, class: 'banner' } })).trim()).toBe('')
  })

  it('draws the screen pages banner: a div with class and role, in that order', async () => {
    const html = await container.renderToString(FixtureBanner, { props: { show: true, class: 'banner', role: 'note', wideSeparator: true } })
    expect(html.trim()).toBe(`<div class="banner" role="note">${NARROW.replace(' · ', '  ·  ')}</div>`)
  })

  it('draws a paragraph with the attributes in the order given', async () => {
    const html = await container.renderToString(FixtureBanner, { props: { show: true, tag: 'p', role: 'note', class: 'x' } })
    expect(html.trim()).toBe(`<p role="note" class="x">${NARROW}</p>`)
  })
})

describe('PageMain', () => {
  it('draws main with the column class, the id and the page markers in order', async () => {
    const html = await container.renderToString(PageMain, { props: { md: '480', 'data-page': 'gerador' }, slots: { default: 'x' } })
    expect(html.trim()).toBe('<main class="mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3 md:max-w-[480px] lg:pt-8" id="main" data-page="gerador">x</main>')
  })

  it('takes the bar clearance, the grid and an id of its own', async () => {
    const html = await container.renderToString(PageMain, { props: { top: 'bar', md: '720', grid: true, lg: '1240', id: 'top' } })
    expect(html).toContain('pt-16 md:max-w-[720px] lg:grid lg:max-w-[1240px] lg:pt-8" id="top"')
  })

  it('omits an attribute whose value is undefined', async () => {
    const html = await container.renderToString(PageMain, { props: { 'data-page': 'x', 'data-uf': undefined } })
    expect(html).not.toContain('data-uf')
  })
})

describe('DocHead', () => {
  it('draws the charset, the viewport and the title of a plain page', async () => {
    const html = await container.renderToString(DocHead, { props: { title: 'T' } })
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">')
    expect(html).toContain('<title>T</title>')
    expect(html).not.toContain('robots')
    expect(html).not.toContain('<base')
  })

  it('an embed head: robots noindex and base target before the title', async () => {
    const html = await container.renderToString(DocHead, { props: { title: 'E', noindex: true, baseTarget: '_blank' } })
    expect(html).toContain('<meta name="robots" content="noindex">')
    expect(html).toContain('<base target="_blank">')
    expect(html.indexOf('robots')).toBeLessThan(html.indexOf('<base'))
    expect(html.indexOf('<base')).toBeLessThan(html.indexOf('<title>'))
  })

  it('a fragment head names its base target', async () => {
    expect(await container.renderToString(DocHead, { props: { title: 'F', noindex: true, baseTarget: '_top' } })).toContain('<base target="_top">')
  })

  it('draws the description and the link-preview tags when given', async () => {
    const preview = { ogTitle: 'OG', description: 'D', url: 'https://x.test/p/', image: { url: 'https://x.test/i.png', type: 'image/png', width: 1200, height: 630, alt: 'A' } }
    const html = await container.renderToString(DocHead, { props: { title: 'T', description: 'Desc', preview } })
    expect(html).toContain('<meta name="description" content="Desc">')
    expect(html).toContain('<meta property="og:title" content="OG">')
    expect(html).toContain('<meta property="og:image:width" content="1200">')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
  })

  it('a preview with no image is the small card', async () => {
    const html = await container.renderToString(DocHead, { props: { title: 'T', preview: { ogTitle: 'OG', description: 'D', url: 'https://x.test/' } } })
    expect(html).toContain('<meta name="twitter:card" content="summary">')
    expect(html).not.toContain('og:image')
  })
})
