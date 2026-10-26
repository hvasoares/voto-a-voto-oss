import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "report-undesigned",
  "title": "Relatório (ainda não desenhado)",
  "route": "/relatorios/:report/",
  "paramValues": {
    "report": [
      "maiores-viradas",
      "votos-ganhos-e-perdidos",
      "disputas-mais-apertadas",
      "comparecimento"
    ]
  },
  "sketchFrame": "(não desenhado) Detalhes dos outros 4 relatórios",
  "references": [],
  "ticket": 13,
  "reads": [
    "depends on the report (turnout + votes + cities)"
  ],
  "mustShow": [
    "Um relatório por rota: maiores viradas (100 mil+ votos), votos ganhos e perdidos vs. 2022, disputas mais apertadas, comparecimento mais alto e mais baixo",
    "Desenho no Sketch ainda não existe: o ticket #13 começa por desenhar o quadro"
  ],
  "links": [
    {
      "label": "‹ Relatórios",
      "to": "/relatorios/"
    }
  ],
  "fixtureRoute": "/relatorios/maiores-viradas/",
  "note": "Sem quadro no Sketch: a página do relatório ainda não foi desenhada."
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = `Relatório · ${ctx.params.report}`
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        back: { label: 'Relatórios', href: ctx.href('/relatorios/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${''}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
