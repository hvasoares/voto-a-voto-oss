import { html } from '../../shared/html'
import type { Slot, SlotContext, SlotMeta } from '../../shared/slot'
import { UF_TILES, type UfTile } from './uf-grid'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "home",
  "title": "Voto a Voto",
  "route": "/",
  "sketchFrame": "1 Home",
  "references": [
    "01-home.png"
  ],
  "ticket": 3,
  "reads": [
    "cities (search by name, accent/case-insensitive, 5.570 cities)",
    "states (27 UF tiles; overseas post never offered as a state)"
  ],
  "mustShow": [
    "Título \"Voto a Voto\" e a frase \"Eleição presidencial 2026, cidade por cidade.\"",
    "Campo \"Busque sua cidade\" com resultados (nome + UF)",
    "Grade dos 27 estados (toque leva à página do estado)",
    "Seção \"Para explorar\": Brasil e regiões, Mapa por estado, Relatórios, Três ciclos por estado",
    "Rodapé \"Dados oficiais do TSE · Sobre os dados ›\""
  ],
  "links": [
    {
      "label": "Cidade Exemplo (resultado da busca)",
      "to": "/:uf/:slug/"
    },
    {
      "label": "RJ (tile do estado)",
      "to": "/:uf/"
    },
    {
      "label": "Brasil e regiões",
      "to": "/brasil/"
    },
    {
      "label": "Mapa por estado",
      "to": "/mapa/"
    },
    {
      "label": "Relatórios",
      "to": "/relatorios/"
    },
    {
      "label": "Três ciclos por estado",
      "to": "/tres-ciclos/:uf/"
    },
    {
      "label": "Sobre os dados ›",
      "to": "/sobre-os-dados/"
    }
  ],
  "fixtureRoute": "/"
}

const EXPLORE = [
  { title: 'Brasil e regiões', sub: 'Resultado nacional e por região, 2º turno', to: '/brasil/' },
  { title: 'Mapa por estado', sub: 'Margem e virada em cada estado', to: '/mapa/' },
  { title: 'Relatórios', sub: 'Viradas, comparações e disputas apertadas', to: '/relatorios/' },
  { title: 'Três ciclos por estado', sub: '2018, 2022 e 2026 lado a lado', to: '/tres-ciclos/:uf/' },
] as const

const SEARCH_ICON = html`<svg class="home-search__icon" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="6.5" cy="6.5" r="6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M16.2 12.2 12.4 16.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`

function tile(ctx: SlotContext, t: UfTile, linked: boolean) {
  const pos = `grid-column:${t.col};grid-row:${t.row}`
  const label = t.uf.toUpperCase()
  return linked
    ? html`<a class="uf-tile" style="${pos}" href="${ctx.href('/:uf/', { uf: t.uf })}" data-uf="${t.uf}">${label}</a>`
    : html`<span class="uf-tile" style="${pos}" data-uf="${t.uf}" aria-disabled="true">${label}</span>`
}

export const slot: Slot = {
  meta,
  hydrated: true,
  async render(ctx: SlotContext) {
    // A tile is a link when the dataset has that state; otherwise it is drawn but inert (a fixture dataset has 3 states, never a dead link).
    const available = new Set((await ctx.data.states()).map((s) => s.uf))
    const pageTitle = 'Voto a Voto'
    return {
      title: pageTitle,
      html: html`<div class="page home" data-component="home">
    <main class="home__main" id="main">
      <h1 class="home__title">Voto a Voto</h1>
      <p class="home__tagline">Eleição presidencial 2026, cidade por cidade.</p>
      <p class="home__compare">Compare com 2018 e 2022.</p>
      <div class="home-search" data-home-search>
        ${SEARCH_ICON}
        <input class="home-search__input" type="search" name="q" placeholder="Busque sua cidade" aria-label="Busque sua cidade" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
      </div>
      <p class="home__hint">Ou escolha um estado. Toque para ver os municípios.</p>
      <nav class="uf-grid" aria-label="Estados" data-uf-grid>
        ${UF_TILES.map((t) => tile(ctx, t, available.has(t.uf)))}
      </nav>
      <h2 class="home__section">Para explorar</h2>
      <ul class="home-list">
        ${EXPLORE.map((e) => html`<li><a class="home-row" href="${ctx.href(e.to)}"><span class="home-row__text"><strong>${e.title}</strong><span>${e.sub}</span></span><span class="home-row__chev" aria-hidden="true">›</span></a></li>`)}
      </ul>
    </main>
    <footer class="home-footer source-footer" data-component="source-footer">Dados oficiais do TSE · <a href="${ctx.href('/sobre-os-dados/')}">Sobre os dados ›</a></footer>
    <div id="consent-slot" data-placeholder="consent-banner" data-ticket="20" hidden></div>
  </div>`,
    }
  },
}
