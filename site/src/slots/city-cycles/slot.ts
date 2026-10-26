import type { Turno } from '../../data'
import { loadCityResult } from '../../shared/city-figures'
import { CYCLES } from '../../shared/city-model'
import { displayName } from '../../shared/city-search'
import { html } from '../../shared/html'
import { fixtureBanner, linkHref, type Slot, type SlotMeta } from '../../shared/slot'
import { buildCycleBlock, DEFAULT_TURNO } from './cycles-model'
import { mountCycles } from './cycles-mount'
import { roundPanel } from './cycles-view'

/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "city-cycles",
  "title": "Três ciclos",
  "route": "/:uf/:slug/tres-ciclos/",
  "sketchFrame": "9 Três ciclos (cidade)",
  "references": [
    "09-tres-ciclos-cidade.png"
  ],
  "ticket": 6,
  "reads": [
    "cities (cycles available)",
    "turnout + votes + candidates (2018, 2022, 2026; round 1 or 2)"
  ],
  "mustShow": [
    "\"Presidente 2018, 2022 e 2026 · <cidade> (1º turno)\"",
    "Para cada ciclo: Votaram X% (barra de votos) e Não votaram Y% (abstenção, brancos, nulos)",
    "Ciclo sem dados: \"sem dados nesse ciclo\", nunca zeros",
    "Legenda Br = brancos, Nu = nulos"
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    },
    {
      "label": "Cartão da cidade",
      "to": "/:uf/:slug/"
    }
  ],
  "fixtureRoute": "/rj/cidade-exemplo/tres-ciclos/?turno=1"
}

const TURNOS: readonly Turno[] = [1, 2]

export const slot: Slot = {
  meta,
  hydrated: true,
  mount(root, ctx) {
    mountCycles(root, ctx)
  },
  async render(ctx) {
    const city = await ctx.data.city(ctx.params.uf!, ctx.params.slug!)
    if (!city) throw new Error(`city not found: ${ctx.params.uf}/${ctx.params.slug}`)
    const name = displayName(city.nome)
    const here = ctx.href('/:uf/:slug/tres-ciclos/')
    const panels = []
    for (const turno of TURNOS) {
      const blocks = []
      for (const ano of CYCLES) blocks.push(buildCycleBlock({ ano, turno, city, result: await loadCityResult(ctx.data, city, ano, turno) }))
      panels.push(roundPanel({ turno, subtitle: `Presidente 2018, 2022 e 2026 · ${name} (${turno}º turno)`, blocks, hidden: turno !== DEFAULT_TURNO }))
    }
    const banner = await fixtureBanner(ctx)
    const other = DEFAULT_TURNO === 2 ? 1 : 2
    return {
      title: `Três ciclos · ${name}`,
      html: html`<div class="page cycles-page" data-component="page-frame">
    <header class="app-header">
      <a class="brand" href="${ctx.href('/')}">Voto a Voto</a>
      <span class="app-header__sep" aria-hidden="true"></span>
      <span class="app-header__context">Presidente 2026</span>
    </header>
    ${banner ? html`<div class="banner" role="note">${banner.replace(' · ', '  ·  ')}</div>` : ''}
    <main class="page__main" id="main">
      <a class="back" href="${linkHref(ctx, meta.links[0]!)}">‹ Início</a>
      <h1 class="page__title">Três ciclos</h1>
      <div class="cycles" data-cycles data-turno="${DEFAULT_TURNO}" data-path="${here}" data-uf="${city.uf}" data-slug="${city.slug}">${panels}</div>
      <p class="cycles__legend">Br = brancos · Nu = nulos. O candidato de menor número na urna fica à esquerda, com a base escura, em todos os ciclos.</p>
      <a class="cycles-switch" href="${here}?turno=${other}" data-switch data-base="${here}">Ver o ${other}º turno ›</a>
      <nav class="cycles-links" aria-label="Mais sobre a cidade"><a href="${linkHref(ctx, meta.links[1]!)}">Cartão da cidade</a></nav>
    </main>
    <footer class="source-footer" data-component="source-footer">Fonte: TSE, dados finais<a class="source-footer__about" href="${ctx.href('/sobre-os-dados/')}">Sobre os dados ›</a></footer>
    <div id="consent-slot" data-placeholder="consent-banner" data-ticket="20" hidden></div>
  </div>`,
    }
  },
}
