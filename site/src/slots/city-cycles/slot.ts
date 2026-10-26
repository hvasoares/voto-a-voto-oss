import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'
import { turnoutBar } from '../../shared/components'
import { turnoutBarProps } from '../../shared/city-figures'

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
  "fixtureRoute": "/rj/cidade-exemplo/tres-ciclos/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const city = await ctx.data.city(ctx.params.uf!, ctx.params.slug!)
    if (!city) throw new Error(`city not found: ${ctx.params.uf}/${ctx.params.slug}`)
    const bars = await Promise.all([2018, 2022, 2026].map(async (ano) => ({ ano, bar: await turnoutBarProps(ctx.data, city, ano, 1) })))
    const pageTitle = `Três ciclos · ${city.nome}`
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: 'Três ciclos',
        subtitle: `Presidente 2018, 2022 e 2026 · ${city.nome} (1º turno)`,
        back: { label: 'Início', href: ctx.href('/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${html`${bars.map(({ ano, bar }) => html`<h2>${ano}</h2>${bar ? turnoutBar(bar) : html`<p>sem dados nesse ciclo</p>`}`)}`}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
