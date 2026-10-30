/**
 * The frame of a share sheet as MARKUP (private#210, the lighter-site milestone): the sheet element's attributes, its handle and title row, and the
 * links under the picture. The one place these are written: `components/ShareSheetFrame.astro` prints them for the demo and Brasil routes, and the
 * city's stub draws the same strings (`lib/share-sheet-draw.ts`) around the picture and the ready-made texts. Only strings and constants; no file
 * system, no fetch, so it runs in Node and in the browser.
 */
import { esc } from '@/shared/html'

export interface ShareSheetAttrs {
  uf?: string
  slug?: string
  view: string
  filename?: string
}

/** The attributes of the `<section data-share-sheet>`, in this order, without `class` (each page passes its own). */
export function shareSheetAttrs({ uf, slug, view, filename }: ShareSheetAttrs): Record<string, string> {
  return { 'data-share-sheet': '', id: 'main', ...(uf !== undefined && { 'data-uf': uf }), ...(slug !== undefined && { 'data-slug': slug }), 'data-view': view, ...(filename !== undefined && { 'data-filename': filename }) }
}

export const attrString = (attrs: Record<string, string>): string => Object.entries(attrs).map(([k, v]) => (v === '' ? k : `${k}="${esc(v)}"`)).join(' ')

export interface ShareFrameHead {
  closeHref: string
  closeClass: string
  /** The "×" after "Fechar" from 768 px (the real routes' dialog). */
  closeCross: boolean
}

/** The handle (a phone's bottom sheet) and the title row with "Fechar". */
export function shareFrameHead({ closeHref, closeClass, closeCross }: ShareFrameHead): string {
  return `<span class="mx-auto block h-1.5 w-16 rounded-full bg-muted md:hidden" aria-hidden="true"></span>
  <div class="flex items-baseline justify-between">
    <h1 class="font-serif text-step-4 font-normal">Compartilhar resultado</h1>
    <a class="${esc(closeClass)}" href="${esc(closeHref)}" data-close>Fechar${closeCross ? '<span class="hidden md:inline" aria-hidden="true"> ×</span>' : ''}</a>
  </div>`
}

/** "Mostrar QR" (it does not depend on the round, so it is there even when the view has no result) and, where a city can be prefilled, the generator link. */
export function shareFrameLinks({ qrHref, generatorHref }: { qrHref: string; generatorHref?: string }): string {
  return `<a class="mt-2 flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background text-step-2 font-bold text-foreground" href="${esc(qrHref)}" data-qr-link>
    Mostrar QR
  </a>${
    generatorHref
      ? `
  <a class="mt-1 flex min-h-11 w-full items-center justify-center text-step-2 font-bold text-primary" href="${esc(generatorHref)}" data-generator-link>
    Criar um cartão com uma medida ›
  </a>`
      : ''
  }`
}

/** The page footer's source line of a share sheet. */
export const shareFooterSource = (fixture: boolean): string => (fixture ? 'Dados fictícios para ilustrar o layout. Fonte real: TSE.' : 'Fonte: TSE, dados finais')

/** The footer's own class on a share sheet (the about link carries none here). */
export const SHARE_FOOTER_CLASS = 'mt-2 border-t border-border pt-2 text-center text-step-1 text-primary'

/** The sheet of the city stub: a card in the page's column (a dialog of 480 px from 768 px), not the real routes' bottom sheet over a backdrop. */
export const STUB_SHEET = 'relative rounded-2xl border border-border bg-background px-5 pt-2 pb-6 md:mx-auto md:max-w-[480px] md:px-7 md:pt-6 md:pb-7'
export const SHARE_CLOSE_CLASS = 'min-h-11 px-1 pt-1 text-step-2 font-bold'
