import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "cohorts",
  "title": "Como cada grupo votou",
  "route": "/relatorios/como-cada-grupo-votou/",
  "sketchFrame": "12 Como cada grupo votou",
  "references": [
    "12-como-cada-grupo-votou.png"
  ],
  "ticket": 15,
  "reads": [
    "turnout + votes + cities (winner of round 2 in 2018, 2022, 2026 per city)"
  ],
  "mustShow": [
    "Quatro grupos (venceu em 2018 e 2022: PT; Bolsonaro; Bolsonaro depois Lula; PT depois Bolsonaro) com contagem de cidades e votos válidos",
    "Vencedor do 2º turno de 2026 por grupo, em % das cidades",
    "Empates contabilizados (os totais fecham)",
    "Rodapé \"Fonte: TSE, dados finais · Sobre os dados ›\""
  ],
  "links": [
    {
      "label": "‹ Relatórios",
      "to": "/relatorios/"
    }
  ],
  "fixtureRoute": "/relatorios/como-cada-grupo-votou/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = 'Como cada grupo votou'
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
