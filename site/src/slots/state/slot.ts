import { html } from '../../shared/html'
import { fixtureBanner, linkHref, type Slot, type SlotContext, type SlotMeta } from '../../shared/slot'
import { frameTexts } from './fixture'
import { mountStateSearch } from './state-search'
import { countLabel, rowMarkup, sketchState, stateRows } from './state-list'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "state",
  "title": "Estado",
  "route": "/:uf/",
  "sketchFrame": "5 Estado (opcional)",
  "references": [
    "05-estado.png"
  ],
  "ticket": 4,
  "reads": [
    "states (municipality count)",
    "cities by UF (name, slug)"
  ],
  "mustShow": [
    "\"Estado selecionado: UF\" e \"N municípios\"",
    "Área do mapa de municípios (reservada para #16/#17)",
    "Busca \"Busque sua cidade em UF\" restrita ao estado",
    "Lista de cidades com link para a página de cada uma",
    "Links \"Ver mapa por estado ›\" e \"Ver os três ciclos do estado ›\""
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    },
    {
      "label": "Ver mapa por estado ›",
      "to": "/mapa/"
    },
    {
      "label": "Ver os três ciclos do estado ›",
      "to": "/tres-ciclos/:uf/"
    }
  ],
  "fixtureRoute": "/rj/?fixture=sketch"
}

const link = (ctx: SlotContext, i: number) => linkHref(ctx, meta.links[i]!)

export const slot: Slot = {
  meta,
  hydrated: true,
  mount(root, ctx) {
    mountStateSearch(root, ctx)
  },
  async render(ctx) {
    const uf = ctx.params.uf!.toLowerCase()
    const state = (await ctx.data.states()).find((s) => s.uf === uf)
    const cities = state ? await ctx.data.citiesByUf(uf) : []
    if (!state || !cities.length) throw new Error(`state not found: ${uf}`)
    const label = uf.toUpperCase()
    const pageTitle = `Estado selecionado: ${label}`
    const sketch = ctx.useFrameFixture ? sketchState(frameTexts) : undefined
    const fixtureData = !!(await ctx.data.manifest()).fixture
    const sub = `${sketch?.subline ?? (fixtureData ? 'Município fictício' : 'Município')} · ${label}`
    let rows = stateRows(cities)
    if (sketch) {
      // The frame draws five illustrative names; keep only dataset cities with those names so every row still links somewhere real.
      const byName = new Map(rows.map((r) => [r.nome, r]))
      rows = sketch.names.flatMap((n) => byName.get(n) ?? [])
    }
    const banner = sketch?.banner ?? (await fixtureBanner(ctx))
    return {
      title: pageTitle,
      html: html`<div class="page state-page" data-component="page-frame">
    <header class="app-header">
      <a class="brand" href="${ctx.href('/')}">Voto a Voto</a>
      <span class="app-header__sep" aria-hidden="true"></span>
      <span class="app-header__context">Presidente 2026</span>
    </header>
    ${banner ? html`<div class="banner" role="note">${banner}</div>` : ''}
    <main class="page__main" id="main">
      <a class="back" href="${ctx.href('/')}">‹ Início</a>
      <h1 class="page__title">${pageTitle}</h1>
      <p class="page__subtitle">${sketch?.countText ?? countLabel(cities.length)}</p>
      <div class="state-map" data-placeholder="state-map" data-ticket="16 17" data-uf="${uf}" data-map-area><span>Espaço do mapa de municípios</span></div>
      <div class="state-search" data-state-search data-uf="${uf}">
        <input class="state-search__input" type="search" name="q" placeholder="Busque sua cidade em ${label}" aria-label="Busque sua cidade em ${label}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
      </div>
      <noscript><p class="state-note">A busca precisa de JavaScript. Use a lista abaixo.</p></noscript>
      <div class="state-results" data-state-results aria-live="polite" hidden></div>
      <ul class="state-list" data-state-list aria-label="Municípios">${rows.map((r) => rowMarkup(ctx.href('/:uf/:slug/', { uf, slug: r.slug }), r.nome, sub))}</ul>
      <nav class="state-links" aria-label="Mais sobre o estado"><a data-link="map" href="${link(ctx, 1)}">Ver mapa por estado ›</a><a data-link="cycles" href="${ctx.href('/tres-ciclos/:uf/', { uf })}">Ver os três ciclos do estado ›</a></nav>
    </main>
    ${sketch ? '' : html`<footer class="source-footer" data-component="source-footer">Fonte: TSE, dados finais · <a href="${ctx.href('/sobre-os-dados/')}">Sobre os dados ›</a></footer>`}
    <div id="consent-slot" data-placeholder="consent-banner" data-ticket="20" hidden></div>
  </div>`,
    }
  },
}
