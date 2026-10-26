import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, linkHref, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'
import { reportListItem } from '../../shared/components'

/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "reports",
  "title": "Relatórios",
  "route": "/relatorios/",
  "sketchFrame": "6 Relatórios",
  "references": [
    "06-relatorios.png"
  ],
  "ticket": 12,
  "reads": [
    "turnout + votes + cities (each report headline number, computed)"
  ],
  "mustShow": [
    "Título \"Relatórios\" e \"2º turno de 2026 e comparação com 2022\"",
    "Sete itens de relatório, cada um com título e número-manchete calculado",
    "Rodapé \"Fonte: TSE, dados finais · Sobre os dados ›\""
  ],
  "links": [
    {
      "label": "Cidades que viraram no 2º turno",
      "to": "/relatorios/cidades-que-viraram/"
    },
    {
      "label": "Maiores viradas, cidades de 100 mil+ votos",
      "to": "/relatorios/:report/",
      "params": {
        "report": "maiores-viradas"
      }
    },
    {
      "label": "Votos ganhos e perdidos vs. 2022",
      "to": "/relatorios/:report/",
      "params": {
        "report": "votos-ganhos-e-perdidos"
      }
    },
    {
      "label": "Disputas mais apertadas",
      "to": "/relatorios/:report/",
      "params": {
        "report": "disputas-mais-apertadas"
      }
    },
    {
      "label": "Comparecimento mais alto e mais baixo",
      "to": "/relatorios/:report/",
      "params": {
        "report": "comparecimento"
      }
    },
    {
      "label": "Comparar com 2022 e 2018",
      "to": "/comparar/2022/"
    },
    {
      "label": "Como cada grupo votou",
      "to": "/relatorios/como-cada-grupo-votou/"
    }
  ],
  "fixtureRoute": "/relatorios/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = 'Relatórios'
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        subtitle: '2º turno de 2026 e comparação com 2022',
        back: { label: 'Início', href: ctx.href('/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${html`${meta.links.map((l) => reportListItem({ title: l.label, summary: '(número-manchete a calcular, #12)', href: linkHref(ctx, l) }))}`}${''}`,
      }),
    }
  },
}
