import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "region-detail",
  "title": "Detalhe de região (ainda não desenhado)",
  "route": "/brasil/:regiao/",
  "paramValues": {
    "regiao": [
      "sudeste",
      "nordeste",
      "sul",
      "norte",
      "centro-oeste"
    ]
  },
  "sketchFrame": "(não desenhado) Detalhe de região",
  "references": [],
  "ticket": 10,
  "reads": [
    "turnout + votes aggregated to one region"
  ],
  "mustShow": [
    "Detalhe de uma região (estados dentro dela). Aparece na página \"Fluxo\" como caixa tracejada, sem quadro no Sketch"
  ],
  "links": [
    {
      "label": "‹ Brasil e regiões",
      "to": "/brasil/"
    }
  ],
  "fixtureRoute": "/brasil/sudeste/",
  "note": "Sem quadro no Sketch: o detalhe de região ainda não foi desenhado."
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = `Região · ${ctx.params.regiao}`
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        back: { label: 'Brasil e regiões', href: ctx.href('/brasil/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${''}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
