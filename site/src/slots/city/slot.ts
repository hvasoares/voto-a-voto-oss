import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'
import { cycleTabs, roundTabs, turnoutBar, candidateRow } from '../../shared/components'
import { candidateRows, turnoutBarProps } from '../../shared/city-figures'

/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "city",
  "title": "Cartão da cidade",
  "route": "/:uf/:slug/",
  "sketchFrame": "2 Cartão da cidade",
  "references": [
    "02-cartao-da-cidade.png"
  ],
  "ticket": 5,
  "reads": [
    "cities (name, UF, cycles)",
    "turnout (2026, round 1 and 2)",
    "votes + candidates (2026)"
  ],
  "mustShow": [
    "Nome da cidade e UF",
    "Abas de ciclo 2018 | 2022 | 2026 e de turno 1º | 2º",
    "Barra \"Votaram X% do eleitorado\" dividida entre os dois candidatos",
    "Barra \"Não votaram Y%\" dividida em abstenção, brancos e nulos",
    "Cinco linhas de legenda (candidato A, B, abstenção, brancos, nulos) com votos e %",
    "Frase-resumo construída com os números",
    "Botão \"Compartilhar\" e links \"Comparar com 2022 ›\", \"Ver os três ciclos ›\", \"Ver o estado ›\""
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    },
    {
      "label": "Compartilhar",
      "to": "/:uf/:slug/compartilhar/"
    },
    {
      "label": "Comparar com 2022 ›",
      "to": "/comparar/2022/"
    },
    {
      "label": "Ver os três ciclos ›",
      "to": "/:uf/:slug/tres-ciclos/"
    },
    {
      "label": "Ver o estado ›",
      "to": "/:uf/"
    }
  ],
  "fixtureRoute": "/rj/cidade-exemplo/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const city = await ctx.data.city(ctx.params.uf!, ctx.params.slug!)
    if (!city) throw new Error(`city not found: ${ctx.params.uf}/${ctx.params.slug}`)
    const turno = ctx.query.get('turno') === '2' ? 2 : 1
    const ano = Number(ctx.query.get('ciclo') ?? 2026)
    const bar = await turnoutBarProps(ctx.data, city, ano, turno)
    const rows = await candidateRows(ctx.data, city, ano, turno)
    const here = ctx.href('/:uf/:slug/')
    const pageTitle = city.nome
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        subtitle: `Município · ${city.uf}`,
        back: { label: 'Início', href: ctx.href('/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${html`${cycleTabs({ cycles: city.ciclos, active: ano, hrefFor: (c) => `${here}?ciclo=${c}&turno=${turno}` })}
        ${roundTabs({ active: turno, hrefFor: (t) => `${here}?ciclo=${ano}&turno=${t}` })}
        ${bar ? turnoutBar(bar) : html`<p>sem dados nesse ciclo</p>`}
        ${rows.map(candidateRow)}`}${navLinks(ctx, meta, (l) => l.label.startsWith('‹') || (city.uf === 'ZZ' && l.to === '/:uf/'))}`,
      }),
    }
  },
}
