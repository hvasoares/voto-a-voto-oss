import type { Turno } from '../../data'
import { loadCityResult } from '../../shared/city-figures'
import { CYCLES, type CityResult } from '../../shared/city-model'
import { displayName, ufLabel } from '../../shared/city-search'
import { cycleTabs, roundTabs } from '../../shared/components'
import { html } from '../../shared/html'
import { fixtureBanner, linkHref, type Slot, type SlotMeta } from '../../shared/slot'
import { viewPanel } from './card'
import { mountCity } from './city-mount'
import { parseView, viewHref, viewId } from './city-view'

/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "city",
  "title": "Cartão da cidade",
  "route": "/:uf/:slug/",
  "sketchFrame": "2 Cartão da cidade",
  "references": [
    "02-cartao-da-cidade.png"
  ],
  "ticket": 5,
  "reads": [
    "cities (name, UF, cycles)",
    "turnout (every cycle and round)",
    "votes + candidates (keyed by cycle, round and number)"
  ],
  "mustShow": [
    "Nome da cidade e UF",
    "Abas de ciclo 2018 | 2022 | 2026 e de turno 1º | 2º",
    "Barra \"Votaram X% do eleitorado\" dividida entre os dois candidatos",
    "Barra \"Não votaram Y%\" dividida em abstenção, brancos e nulos",
    "Cinco linhas de legenda (candidato A, B, abstenção, brancos, nulos) com votos e %",
    "Frase-resumo construída com os números",
    "Botão \"Compartilhar\" e links \"Comparar com 2022 ›\", \"Ver os três ciclos ›\", \"Ver o estado ›\""
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    },
    {
      "label": "Compartilhar",
      "to": "/:uf/:slug/compartilhar/"
    },
    {
      "label": "Comparar com 2022 ›",
      "to": "/comparar/2022/"
    },
    {
      "label": "Ver os três ciclos ›",
      "to": "/:uf/:slug/tres-ciclos/"
    },
    {
      "label": "Ver o estado ›",
      "to": "/:uf/"
    }
  ],
  "fixtureRoute": "/rj/cidade-exemplo/?turno=1"
}

const link = (ctx: Parameters<typeof linkHref>[0], i: number) => linkHref(ctx, meta.links[i]!)

export const slot: Slot = {
  meta,
  hydrated: true,
  mount(root, ctx) {
    mountCity(root, ctx)
  },
  async render(ctx) {
    const city = await ctx.data.city(ctx.params.uf!, ctx.params.slug!)
    if (!city) throw new Error(`city not found: ${ctx.params.uf}/${ctx.params.slug}`)
    const name = displayName(city.nome)
    const overseas = city.uf === 'zz'
    const results = new Map<string, CityResult | undefined>()
    for (const ano of CYCLES) for (const turno of [1, 2] as const) results.set(viewId({ ano, turno }), await loadCityResult(ctx.data, city, ano, turno))
    const has = (ano: number, turno: Turno) => !!results.get(viewId({ ano, turno }))
    const view = parseView(ctx.query, has)
    const here = ctx.href('/:uf/:slug/')
        const fixtureData = !!(await ctx.data.manifest()).fixture
    const banner = await fixtureBanner(ctx)
    const title = `${name} · ${ufLabel(city.uf)}`
    const sub = overseas ? 'Voto no exterior' : `${fixtureData ? 'Município fictício' : 'Município'} · ${ufLabel(city.uf)}`
    return {
      title,
      html: html`<div class="page city-page" data-component="page-frame">
    <header class="app-header">
      <a class="brand" href="${ctx.href('/')}">Voto a Voto</a>
      <span class="app-header__sep" aria-hidden="true"></span>
      <span class="app-header__context">Presidente 2026</span>
    </header>
    ${banner ? html`<div class="banner" role="note">${banner.replace(' · ', '  ·  ')}</div>` : ''}
    <main class="page__main" id="main">
      <a class="back" href="${link(ctx, 0)}">‹ Início</a>
      <h1 class="page__title">${name}</h1>
      <p class="page__subtitle">${sub}</p>
      ${cycleTabs({ cycles: [...CYCLES], active: view.ano, hrefFor: (c) => viewHref(here, { ano: c, turno: view.turno }) })}
      ${roundTabs({ active: view.turno, hrefFor: (t) => viewHref(here, { ano: view.ano, turno: t }) })}
      <div class="city-card" data-city-card data-view="${viewId(view)}" data-path="${here}" data-uf="${city.uf}" data-slug="${city.slug}">${[...results].map(([id, r]) => html`<div class="city-panel" data-view="${id}" ${id === viewId(view) ? '' : 'hidden'}>${viewPanel(r, name)}</div>`)}</div>
      <a class="city-share" href="${link(ctx, 1)}?ciclo=${view.ano}&turno=${view.turno}" data-share data-base="${link(ctx, 1)}">Compartilhar</a>
      <nav class="city-links" aria-label="Mais sobre a cidade"><a href="${link(ctx, 2)}">Comparar com 2022 ›</a><a href="${link(ctx, 3)}">Ver os três ciclos ›</a>${overseas ? '' : html`<a href="${link(ctx, 4)}">Ver o estado ›</a>`}</nav>
    </main>
    <footer class="source-footer" data-component="source-footer">${fixtureData ? 'Dados fictícios para ilustrar o layout. Fonte real: TSE.' : 'Fonte: TSE, dados finais'}<a class="source-footer__about" href="${ctx.href('/sobre-os-dados/')}">Sobre os dados ›</a></footer>
    <div id="consent-slot" data-placeholder="consent-banner" data-ticket="20" hidden></div>
  </div>`,
    }
  },
}
