/**
 * The exact-markup contract of the footer builders (#113): each variant is compared to the literal bytes the
 * build emitted for it on the main commit (#113's baseline), so a drift in a class, a separator or a quote is
 * a red test here before the html-diff tool ever runs.
 */
import { describe, expect, it } from 'vitest'
import { FOOTER_LINK, NAV_CHIP, NAV_CHIP_QUIET, NAV_CHIP_QUIET_PRIMARY } from './link-classes'
import { globalFooterLines, sourceFooter } from './footer'

const EDITION = { editionHref: '/edicoes/2026-10-26/', editionLabel: '26/10/2026' }
const PRIVACY = '/sobre-os-dados/#privacidade'
const LINKS = [
  { href: '/relatorios/', label: 'Relatórios' },
  { href: '/mapa/', label: 'Mapa por estado' },
]

describe('sourceFooter — the pilot page variants (the city card /rj/cidade-exemplo/)', () => {
  it('fixture edition: byte-identical to the pilot’s old footer', () => {
    expect(sourceFooter({ source: 'Dados fictícios para ilustrar o layout. Fonte real: TSE.', aboutHref: '/sobre-os-dados/' })).toBe(
      '<footer class="source-footer" data-component="source-footer">Dados fictícios para ilustrar o layout. Fonte real: TSE.<a class="source-footer__about" href="/sobre-os-dados/">Sobre os dados ›</a></footer>',
    )
  })

  it('real edition: the same footer with the TSE source note', () => {
    expect(sourceFooter({ source: 'Fonte: TSE, dados finais', aboutHref: '/sobre-os-dados/' })).toBe(
      '<footer class="source-footer" data-component="source-footer">Fonte: TSE, dados finais<a class="source-footer__about" href="/sobre-os-dados/">Sobre os dados ›</a></footer>',
    )
  })

  it('the standard page variant: a visible link with the " · " separator (covered by props, migrated by #114-116)', () => {
    expect(
      sourceFooter({
        source: 'Fonte: TSE, dados finais',
        aboutHref: '/sobre-os-dados/',
        aboutClass: FOOTER_LINK,
        separator: ' · ',
        class: 'mx-auto mt-2 w-full max-w-[430px] md:max-w-[760px] border-t border-border px-5 pb-6 pt-2 text-center text-step-1 text-primary',
      }),
    ).toBe(
      '<footer class="mx-auto mt-2 w-full max-w-[430px] md:max-w-[760px] border-t border-border px-5 pb-6 pt-2 text-center text-step-1 text-primary" data-component="source-footer">Fonte: TSE, dados finais · <a class="inline-flex min-h-11 items-center" href="/sobre-os-dados/">Sobre os dados ›</a></footer>',
    )
  })

  it('the no-link variant (edicoes, api): aboutLink false', () => {
    expect(
      sourceFooter({
        source: 'Fonte: TSE, dados finais',
        aboutHref: '/sobre-os-dados/',
        aboutLink: false,
        class: 'mx-auto w-full max-w-[430px] md:max-w-[760px] mt-2 border-t border-border px-5 pb-6 pt-2 text-center text-step-1 text-primary',
      }),
    ).toBe(
      '<footer class="mx-auto w-full max-w-[430px] md:max-w-[760px] mt-2 border-t border-border px-5 pb-6 pt-2 text-center text-step-1 text-primary" data-component="source-footer">Fonte: TSE, dados finais</footer>',
    )
  })

  it('the cohorts variant (#115): the about link of /relatorios/como-cada-grupo-votou/ drops the chevron', () => {
    expect(
      sourceFooter({
        source: 'Fonte: TSE, dados finais',
        aboutHref: '/sobre-os-dados/',
        aboutClass: '',
        aboutLabel: 'Sobre os dados',
        separator: ' · ',
        class: 'mx-auto w-full max-w-[430px] md:max-w-[760px] mt-2 border-t border-border px-5 pb-6 pt-2 text-center text-step-1 text-primary',
      }),
    ).toBe(
      '<footer class="mx-auto w-full max-w-[430px] md:max-w-[760px] mt-2 border-t border-border px-5 pb-6 pt-2 text-center text-step-1 text-primary" data-component="source-footer">Fonte: TSE, dados finais · <a href="/sobre-os-dados/">Sobre os dados</a></footer>',
    )
  })

  it('the share-sheet/story/recap variant (#114): aboutClass \'\' leaves the about link with NO class attribute', () => {
    expect(
      sourceFooter({
        source: 'Fonte: TSE, dados finais',
        aboutHref: '/sobre-os-dados/',
        aboutClass: '',
        separator: ' · ',
        class: 'mt-2 border-t border-border pt-2 text-center text-step-1 text-primary',
      }),
    ).toBe(
      '<footer class="mt-2 border-t border-border pt-2 text-center text-step-1 text-primary" data-component="source-footer">Fonte: TSE, dados finais · <a href="/sobre-os-dados/">Sobre os dados ›</a></footer>',
    )
  })

  it('the BrasilScreen variant (#114): the host template’s scoped-style marker and the backdrop’s aria-hidden', () => {
    const brasilClass = 'mx-5 mt-2 pb-6 pt-2 text-center text-step-1 md:mx-auto md:max-w-[720px] lg:text-left text-muted-foreground'
    expect(
      sourceFooter({
        source: 'Fonte: TSE, dados finais',
        aboutHref: '/sobre-os-dados/',
        aboutClass: FOOTER_LINK,
        separator: ' · ',
        class: brasilClass,
        scopeMarker: 'data-astro-cid-tsexhqgk',
      }),
    ).toBe(
      '<footer class="mx-5 mt-2 pb-6 pt-2 text-center text-step-1 md:mx-auto md:max-w-[720px] lg:text-left text-muted-foreground" data-component="source-footer" data-astro-cid-tsexhqgk>Fonte: TSE, dados finais · <a class="inline-flex min-h-11 items-center" href="/sobre-os-dados/" data-astro-cid-tsexhqgk>Sobre os dados ›</a></footer>',
    )
    expect(
      sourceFooter({
        source: 'Fonte: TSE, dados finais',
        aboutHref: '/sobre-os-dados/',
        aboutClass: FOOTER_LINK,
        separator: ' · ',
        class: brasilClass,
        ariaHidden: true,
        scopeMarker: 'data-astro-cid-tsexhqgk',
      }),
    ).toBe(
      '<footer class="mx-5 mt-2 pb-6 pt-2 text-center text-step-1 md:mx-auto md:max-w-[720px] lg:text-left text-muted-foreground" data-component="source-footer" aria-hidden="true" data-astro-cid-tsexhqgk>Fonte: TSE, dados finais · <a class="inline-flex min-h-11 items-center" href="/sobre-os-dados/" data-astro-cid-tsexhqgk>Sobre os dados ›</a></footer>',
    )
  })
})

describe('globalFooterLines — the Base.astro block (the pilot page’s second footer)', () => {
  it('chip on, no donation address: byte-identical to the pilot’s old global footer', () => {
    expect(globalFooterLines({ ...EDITION, privacyHref: PRIVACY, links: LINKS })).toBe(
      '<div class="mx-auto w-full max-w-[430px] px-5 pb-3 text-center text-step-1" data-component="consent-footer"><a class="inline-flex min-h-11 items-center" href="/edicoes/2026-10-26/" data-edition-link>Edição 26/10/2026</a><span aria-hidden="true"> · </span><a class="inline-flex min-h-11 items-center" href="/sobre-os-dados/#privacidade">Privacidade</a><div><span class="inline-block whitespace-nowrap rounded-md border border-border bg-secondary px-2 py-0.5 align-middle font-bold text-foreground" data-finality-chip>Final, não ao vivo</span><span aria-hidden="true"> · </span><a class="inline-flex min-h-11 items-center" href="/relatorios/">Relatórios</a><span aria-hidden="true"> · </span><a class="inline-flex min-h-11 items-center" href="/mapa/">Mapa por estado</a></div></div>',
    )
  })

  it('donation on (PUBLIC_DONATION_URL set): byte-identical to the pilot’s old footer with the link', () => {
    expect(
      globalFooterLines({ ...EDITION, privacyHref: PRIVACY, links: LINKS, donationUrl: 'https://doacao.example.test/apoie' }),
    ).toBe(
      '<div class="mx-auto w-full max-w-[430px] px-5 pb-3 text-center text-step-1" data-component="consent-footer"><a class="inline-flex min-h-11 items-center" href="/edicoes/2026-10-26/" data-edition-link>Edição 26/10/2026</a><span aria-hidden="true"> · </span><a class="inline-flex min-h-11 items-center" href="/sobre-os-dados/#privacidade">Privacidade</a><span aria-hidden="true"> · </span><a class="inline-flex min-h-11 items-center" href="https://doacao.example.test/apoie" target="_blank" rel="noopener noreferrer" data-donation-link>Apoie o projeto ↗<span class="sr-only"> (abre em nova aba)</span></a><div><span class="inline-block whitespace-nowrap rounded-md border border-border bg-secondary px-2 py-0.5 align-middle font-bold text-foreground" data-finality-chip>Final, não ao vivo</span><span aria-hidden="true"> · </span><a class="inline-flex min-h-11 items-center" href="/relatorios/">Relatórios</a><span aria-hidden="true"> · </span><a class="inline-flex min-h-11 items-center" href="/mapa/">Mapa por estado</a></div></div>',
    )
  })

  it('donation off with an address configured draws nothing', () => {
    const withLink = globalFooterLines({ ...EDITION, privacyHref: PRIVACY, links: LINKS })
    expect(globalFooterLines({ ...EDITION, privacyHref: PRIVACY, links: LINKS, donationUrl: 'https://doacao.example.test/apoie', donation: false })).toBe(withLink)
  })

  it('the QuietDoc variant: one line, no link classes, no chip line (chip: false, links: [])', () => {
    expect(
      globalFooterLines({
        ...EDITION,
        privacyHref: PRIVACY,
        chip: false,
        links: [],
        class: 'mx-auto w-full max-w-[430px] px-5 pb-6 pt-2 text-center text-step-1',
        linkClass: '',
      }),
    ).toBe(
      '<div class="mx-auto w-full max-w-[430px] px-5 pb-6 pt-2 text-center text-step-1" data-component="consent-footer"><a href="/edicoes/2026-10-26/" data-edition-link>Edição 26/10/2026</a><span aria-hidden="true"> · </span><a href="/sobre-os-dados/#privacidade">Privacidade</a></div>',
    )
  })

  it('the links list is a prop: a custom list replaces the default line after the chip', () => {
    const out = globalFooterLines({ ...EDITION, privacyHref: PRIVACY, links: [{ href: '/api/', label: 'API' }] })
    expect(out).toContain('</span><span aria-hidden="true"> · </span><a class="inline-flex min-h-11 items-center" href="/api/">API</a></div>')
    expect(out).not.toContain('Mapa por estado')
  })
})

describe('the nav-link class tokens (#113 census: 16 + 11 + 1 copies of three variants)', () => {
  it('the tokens are the exact strings the copies carry today', () => {
    expect(NAV_CHIP).toBe('inline-flex min-h-11 items-center rounded-md border border-border px-3 text-step-2 font-bold')
    expect(NAV_CHIP_QUIET).toBe(`${NAV_CHIP} lg:min-h-8 lg:border-0 lg:px-0 lg:text-step-1 lg:font-normal`)
    expect(NAV_CHIP_QUIET_PRIMARY).toBe(`${NAV_CHIP_QUIET} lg:text-primary`)
    expect(FOOTER_LINK).toBe('inline-flex min-h-11 items-center')
  })

  it('every token keeps the 44 px tap target (#19)', () => {
    for (const token of [NAV_CHIP, NAV_CHIP_QUIET, NAV_CHIP_QUIET_PRIMARY, FOOTER_LINK]) expect(token).toContain('min-h-11')
  })
})
