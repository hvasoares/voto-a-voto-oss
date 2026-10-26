import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "home",
  "title": "Voto a Voto",
  "route": "/",
  "sketchFrame": "1 Home",
  "references": [
    "01-home.png"
  ],
  "ticket": 3,
  "reads": [
    "cities (search by name, accent/case-insensitive, 5.570 cities)",
    "states (27 UF tiles; overseas post never offered as a state)"
  ],
  "mustShow": [
    "Título \"Voto a Voto\" e a frase \"Eleição presidencial 2026, cidade por cidade.\"",
    "Campo \"Busque sua cidade\" com resultados (nome + UF)",
    "Grade dos 27 estados (toque leva à página do estado)",
    "Seção \"Para explorar\": Brasil e regiões, Mapa por estado, Relatórios, Três ciclos por estado",
    "Rodapé \"Dados oficiais do TSE · Sobre os dados ›\""
  ],
  "links": [
    {
      "label": "Cidade Exemplo (resultado da busca)",
      "to": "/:uf/:slug/"
    },
    {
      "label": "RJ (tile do estado)",
      "to": "/:uf/"
    },
    {
      "label": "Brasil e regiões",
      "to": "/brasil/"
    },
    {
      "label": "Mapa por estado",
      "to": "/mapa/"
    },
    {
      "label": "Relatórios",
      "to": "/relatorios/"
    },
    {
      "label": "Três ciclos por estado",
      "to": "/tres-ciclos/:uf/"
    },
    {
      "label": "Sobre os dados ›",
      "to": "/sobre-os-dados/"
    }
  ],
  "fixtureRoute": "/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const states = await ctx.data.states()
    const pageTitle = 'Voto a Voto'
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        subtitle: 'Eleição presidencial 2026, cidade por cidade.',
        banner: await fixtureBanner(ctx),
        footer: { text: 'Dados oficiais do TSE', aboutLink: true },
        children: html`${notHydratedMarker(meta)}${html`<p class="ph" data-placeholder="search-box" data-ticket="3"><span class="ph__tag">placeholder · busca · #3</span>Busque sua cidade</p>
        <ul class="slot-links" aria-label="Estados">${states.map((s) => html`<li><a href="${ctx.href('/:uf/', { uf: s.uf })}">${s.uf.toUpperCase()}</a></li>`)}</ul>`}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
