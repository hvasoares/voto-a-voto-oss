import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "share",
  "title": "Compartilhar resultado",
  "route": "/:uf/:slug/compartilhar/",
  "sketchFrame": "3 Folha de compartilhamento",
  "references": [
    "03-compartilhamento.png"
  ],
  "ticket": 7,
  "reads": [
    "cities",
    "turnout + votes + candidates (2026, the round on the city card) to draw the picture in the browser"
  ],
  "mustShow": [
    "Folha \"Compartilhar resultado\" sobre o cartão da cidade, com botão \"Fechar\"",
    "Prévia da imagem: nome, ciclo, turno, Votaram/Não votaram, endereço curto (sem QR)",
    "Botões \"Compartilhar\", \"Baixar imagem\" e \"Mostrar QR\"",
    "Nota: o link vai no texto da mensagem; a imagem leva só o endereço curto"
  ],
  "links": [
    {
      "label": "Fechar",
      "to": "/:uf/:slug/"
    },
    {
      "label": "Mostrar QR",
      "to": "/:uf/:slug/qr/"
    }
  ],
  "fixtureRoute": "/rj/cidade-exemplo/compartilhar/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const city = await ctx.data.city(ctx.params.uf!, ctx.params.slug!)
    if (!city) throw new Error(`city not found: ${ctx.params.uf}/${ctx.params.slug}`)
    const pageTitle = `Compartilhar · ${city.nome}`
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: pageTitle,
        subtitle: city.nome,
        back: { label: 'Fechar', href: ctx.href('/:uf/:slug/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${''}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
