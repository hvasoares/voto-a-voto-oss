import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "brasil",
  "title": "Brasil e regiões",
  "route": "/brasil/",
  "sketchFrame": "8 Brasil e regiões",
  "references": [
    "08-brasil-e-regioes.png"
  ],
  "ticket": 10,
  "reads": [
    "turnout + votes aggregated to Brasil and to the 5 regions (round 2)"
  ],
  "mustShow": [
    "\"2º turno de 2026\"",
    "Brasil, votos válidos: barra Lula x Flavio",
    "Por região: % dos votos válidos do país, barra de votos e barra de comparecimento",
    "Notas de leitura das barras",
    "Link \"Ver mapa por estado ›\""
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
      "label": "Sudeste (detalhe de região, não desenhado)",
      "to": "/brasil/:regiao/"
    }
  ],
  "fixtureRoute": "/brasil/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = 'Brasil e regiões'
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        subtitle: '2º turno de 2026',
        back: { label: 'Início', href: ctx.href('/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${''}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
