import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "state",
  "title": "Estado",
  "route": "/:uf/",
  "sketchFrame": "5 Estado (opcional)",
  "references": [
    "05-estado.png"
  ],
  "ticket": 4,
  "reads": [
    "states (municipality count)",
    "cities by UF (name, slug)"
  ],
  "mustShow": [
    "\"Estado selecionado: UF\" e \"N municípios\"",
    "Área do mapa de municípios (reservada para #16/#17)",
    "Busca \"Busque sua cidade em UF\" restrita ao estado",
    "Lista de cidades com link para a página de cada uma",
    "Links \"Ver mapa por estado ›\" e \"Ver os três ciclos do estado ›\""
  ],
  "links": [
    {
      "label": "‹ Início",
      "to": "/"
    },
    {
      "label": "Ver mapa por estado ›",
      "to": "/mapa/"
    },
    {
      "label": "Ver os três ciclos do estado ›",
      "to": "/tres-ciclos/:uf/"
    }
  ],
  "fixtureRoute": "/rj/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const uf = ctx.params.uf!.toLowerCase()
    const cities = await ctx.data.citiesByUf(uf)
    if (!cities.length) throw new Error(`state not found: ${uf}`)
    const pageTitle = `Estado selecionado: ${uf.toUpperCase()}`
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        subtitle: `${cities.length} municípios`,
        back: { label: 'Início', href: ctx.href('/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${html`<div class="ph" data-placeholder="state-map" data-ticket="16"><span class="ph__tag">placeholder · mapa do estado · #16 e #17</span>Mapa de municípios (reservado)</div>
        <ul class="slot-links" aria-label="Municípios">${cities.map((c) => html`<li><a href="${ctx.href('/:uf/:slug/', { slug: c.slug })}">${c.nome}</a></li>`)}</ul>`}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
