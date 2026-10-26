import { withBase } from './paths'
import { html } from './shared/html'
import { pageFrame } from './shared/page-frame'
import type { SlotPage } from './shared/slot'

/** Content of 404.html and of unknown paths. Not a slot: it has no ticket and no Sketch frame. */
export function notFoundPage(base: string): SlotPage {
  return {
    title: 'Página não encontrada',
    html: pageFrame({
      base,
      title: 'Página não encontrada',
      subtitle: 'Esse endereço não existe.',
      back: { label: 'Início', href: withBase(base, '/') },
      children: html`<p data-not-found="1">Confira o endereço ou volte ao início para buscar sua cidade.</p>`,
    }),
  }
}
