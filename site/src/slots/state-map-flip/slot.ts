import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "state-map-flip",
  "title": "Mapa por estado: virada",
  "route": "/mapa/virada/",
  "sketchFrame": "10b Mapa por estado: virada",
  "references": [
    "10b-virada-mosaico.png",
    "10b-virada-mapa.png"
  ],
  "ticket": 11,
  "reads": [
    "turnout + votes aggregated per state (change of margin between round 1 and round 2)"
  ],
  "mustShow": [
    "Mesma estrutura do mapa por estado, mostrando a variação da margem entre os turnos (pp)",
    "Escala sem estados negativos: \"Sem estados com variação negativa\" quando for o caso",
    "Estado selecionado com votos válidos e as duas margens"
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    },
    {
      "label": "Margem (2º turno)",
      "to": "/mapa/"
    },
    {
      "label": "Mapa (vista)",
      "to": "/mapa/virada/",
      "query": "vista=mapa"
    },
    {
      "label": "Abrir estado",
      "to": "/:uf/"
    }
  ],
  "fixtureRoute": "/mapa/virada/",
  "extraFixtures": [
    {
      "name": "mapa",
      "route": "/mapa/virada/?vista=mapa",
      "reference": "10b-virada-mapa.png"
    }
  ]
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = 'Mapa por estado: virada'
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        subtitle: 'Variação da margem entre o 1º e o 2º turno de 2026, em pontos percentuais (pp), por estado',
        back: { label: 'Início', href: ctx.href('/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${''}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
