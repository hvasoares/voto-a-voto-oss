import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "state-cycles",
  "title": "Três ciclos por estado",
  "route": "/tres-ciclos/:uf/",
  "sketchFrame": "13 Três ciclos por estado",
  "references": [
    "13-tres-ciclos-por-estado.png"
  ],
  "ticket": 14,
  "reads": [
    "turnout + votes aggregated per state for 2018, 2022, 2026 (round 2)"
  ],
  "mustShow": [
    "Seletor de estado (SP, MG, RJ, BA, PR, RS, PE, CE)",
    "Barras 2018, 2022 e 2026 do estado e mudança de Lula em pp contra o ciclo anterior",
    "Legenda de cores (vermelho = Lula, azul = Bolsonaro/Flavio)",
    "Seção \"Outros estados\" com as três barras de cada um",
    "Links \"Ver o estado ›\" e \"Ver os três ciclos de uma cidade ›\""
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    },
    {
      "label": "Ver o estado ›",
      "to": "/:uf/"
    },
    {
      "label": "Ver os três ciclos de uma cidade ›",
      "to": "/:uf/:slug/tres-ciclos/"
    }
  ],
  "fixtureRoute": "/tres-ciclos/sp/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const states = await ctx.data.states()
    const pageTitle = `Três ciclos por estado · ${ctx.params.uf!.toUpperCase()}`
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        subtitle: 'Presidente 2026 (2º turno) comparado com 2022 e 2018, no mesmo estado.',
        back: { label: 'Início', href: ctx.href('/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${html`<ul class="slot-links" aria-label="Estados">${states.map((s) => html`<li><a href="${ctx.href('/tres-ciclos/:uf/', { uf: s.uf.toLowerCase() })}">${s.uf}</a></li>`)}</ul>`}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
