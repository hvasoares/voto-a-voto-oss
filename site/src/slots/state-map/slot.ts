import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "state-map",
  "title": "Mapa por estado",
  "route": "/mapa/",
  "sketchFrame": "10 Mapa por estado",
  "references": [
    "10-mapa-por-estado-mosaico.png",
    "10-mapa-por-estado-mapa.png"
  ],
  "ticket": 11,
  "reads": [
    "turnout + votes aggregated per state (round 2 margin Lula - Flavio, valid votes)"
  ],
  "mustShow": [
    "Abas \"Margem (2º turno)\" | \"Virada (1º→2º)\" e alternância \"Mosaico\" | \"Mapa\"",
    "Mosaico de estados: tamanho = votos válidos, cor = margem, sinal escrito em cada tile",
    "Escala de cores e legenda de leitura",
    "Estado selecionado: votos válidos e margens, botão \"Abrir estado\"",
    "Rodapé \"Fonte: TSE, dados finais · Sobre os dados ›\""
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    },
    {
      "label": "Virada (1º→2º)",
      "to": "/mapa/virada/"
    },
    {
      "label": "Mapa (vista)",
      "to": "/mapa/",
      "query": "vista=mapa"
    },
    {
      "label": "Abrir estado",
      "to": "/:uf/"
    }
  ],
  "fixtureRoute": "/mapa/",
  "extraFixtures": [
    {
      "name": "mapa",
      "route": "/mapa/?vista=mapa",
      "reference": "10-mapa-por-estado-mapa.png"
    }
  ]
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = 'Mapa por estado'
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        subtitle: 'Margem de Lula sobre Flavio no 2º turno de 2026, em pontos percentuais (pp), por estado',
        back: { label: 'Início', href: ctx.href('/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${''}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
