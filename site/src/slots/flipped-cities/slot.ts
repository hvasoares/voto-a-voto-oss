import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "flipped-cities",
  "title": "Cidades que viraram no 2º turno",
  "route": "/relatorios/cidades-que-viraram/",
  "sketchFrame": "7 Relatório: cidades que viraram",
  "references": [
    "07-cidades-que-viraram.png"
  ],
  "ticket": 12,
  "reads": [
    "turnout + votes (rounds 1 and 2, margin per city)",
    "cities (name, UF)"
  ],
  "mustShow": [
    "Título e explicação (cidades com 5 mil+ votos válidos; margem em pontos percentuais)",
    "Lista ordenada de cidades: margem 1º turno → margem 2º turno e votos válidos",
    "Aviso \"Compare por pontos percentuais, não por votos absolutos\"",
    "Botão \"Compartilhar\"",
    "Rodapé \"Fonte: TSE, dados finais · Sobre os dados ›\""
  ],
  "links": [
    {
      "label": "‹ Relatórios",
      "to": "/relatorios/"
    },
    {
      "label": "Cidade Exemplo (linha da lista)",
      "to": "/:uf/:slug/"
    }
  ],
  "fixtureRoute": "/relatorios/cidades-que-viraram/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const pageTitle = 'Cidades que viraram no 2º turno'
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
