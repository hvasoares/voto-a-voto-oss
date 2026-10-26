import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "compare-2022",
  "title": "Comparar com 2022",
  "route": "/comparar/2022/",
  "sketchFrame": "11 Comparar com 2022",
  "references": [
    "11-comparar-2022.png"
  ],
  "ticket": 14,
  "reads": [
    "turnout + votes aggregated per state (2026 round 2 vs 2022 round 2, largest states)"
  ],
  "mustShow": [
    "Abas de ciclo 2018 | 2022 e título \"Comparar com 2022\"",
    "Por estado (os seis maiores): votos válidos; Lula e Flavio com percentual em 2026, percentual em 2022 e diferença de votos",
    "Rodapé \"Fonte: TSE, dados finais · Sobre os dados ›\""
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    },
    {
      "label": "Comparar com 2018",
      "to": "/comparar/2018/"
    },
    {
      "label": "SP (linha de estado)",
      "to": "/:uf/"
    }
  ],
  "fixtureRoute": "/comparar/2022/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = 'Comparar com 2022'
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        back: { label: 'Início', href: ctx.href('/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${''}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
