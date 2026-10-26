import { html } from '../../shared/html'
import { pageFrame } from '../../shared/page-frame'
import { fixtureBanner, navLinks, notHydratedMarker, type Slot, type SlotMeta } from '../../shared/slot'


/** Contract: see CONTRACT.md next to this file. Edit ONLY files in this directory (plus src/shared if the contract says so). */
export const meta: SlotMeta = {
  "id": "qr",
  "title": "Mostrar QR",
  "route": "/:uf/:slug/qr/",
  "sketchFrame": "4 Mostrar QR",
  "references": [
    "04-mostrar-qr.png"
  ],
  "ticket": 9,
  "reads": [
    "cities (slug -> short address)"
  ],
  "mustShow": [
    "Título \"Mostrar QR\" e \"Presidente 2026 · <cidade>\"",
    "QR escaneável do endereço curto da cidade e o endereço por extenso",
    "Botão \"Voltar\" e \"‹ Fechar\"",
    "Pôster imprimível de uma página"
  ],
  "links": [
    {
      "label": "‹ Fechar",
      "to": "/:uf/:slug/"
    },
    {
      "label": "Voltar",
      "to": "/:uf/:slug/compartilhar/"
    }
  ],
  "fixtureRoute": "/rj/cidade-exemplo/qr/"
}

export const slot: Slot = {
  meta,
  /** Set to true when you replace the blank render below (and flip the test in slot.test.ts). */
  hydrated: false,
  async render(ctx) {
    const city = await ctx.data.city(ctx.params.uf!, ctx.params.slug!)
    if (!city) throw new Error(`city not found: ${ctx.params.uf}/${ctx.params.slug}`)
    const pageTitle = `Mostrar QR · ${city.nome}`
    return {
      title: pageTitle,
      html: pageFrame({
        base: ctx.base,
        title: 'Mostrar QR',
        subtitle: `Presidente 2026 · ${city.nome}`,
        back: { label: 'Fechar', href: ctx.href('/:uf/:slug/') },
        banner: await fixtureBanner(ctx),
        children: html`${notHydratedMarker(meta)}${''}${navLinks(ctx, meta)}`,
      }),
    }
  },
}
