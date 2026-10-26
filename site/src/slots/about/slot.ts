import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "about",
  "title": "Sobre os dados",
  "route": "/sobre-os-dados/",
  "sketchFrame": "14 Sobre os dados",
  "references": [
    "14-sobre-os-dados.png"
  ],
  "ticket": 18,
  "reads": [
    "manifest (sources, hashes, retrieval dates)"
  ],
  "mustShow": [
    "\"De onde vêm os números\", \"O que foi conferido\", \"O que ainda não temos\", \"Limites\"",
    "\"Confira você mesmo\" em quatro passos e \"Código aberto\"",
    "Rodapé \"Fonte: TSE, dados finais\""
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    }
  ],
  "fixtureRoute": "/sobre-os-dados/",
  "note": "Atenção: este quadro tem 390x1123 (página longa), não 390x844; a referência tem a altura inteira."
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = 'Sobre os dados'
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        back: { label: 'Início', href: ctx.href('/') },
        banner: await fixtureBanner(ctx),
        footer: { text: 'Fonte: TSE, dados finais', aboutLink: false },
        children: html`${notHydratedMarker(meta)}${''}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
