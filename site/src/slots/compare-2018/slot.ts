import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "compare-2018",
  "title": "Comparar com 2018",
  "route": "/comparar/2018/",
  "sketchFrame": "11b Comparar com 2018",
  "references": [
    "11b-comparar-2018.png"
  ],
  "ticket": 14,
  "reads": [
    "turnout + votes aggregated per state (2026 round 2 vs 2018 round 2, largest states)"
  ],
  "mustShow": [
    "Abas de ciclo 2018 | 2022 e título \"Comparar com 2018\"",
    "Por estado (os seis maiores): votos válidos; Lula e Flavio com percentual em 2026, percentual em 2018 e diferença de votos",
    "Rodapé \"Fonte: TSE, dados finais · Sobre os dados ›\""
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    },
    {
      "label": "Comparar com 2022",
      "to": "/comparar/2022/"
    },
    {
      "label": "SP (linha de estado)",
      "to": "/:uf/"
    }
  ],
  "fixtureRoute": "/comparar/2018/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = 'Comparar com 2018'
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
