import { withBase } from '../paths'
import { html, Raw } from './html'

/**
 * PLACEHOLDER-LEVEL shared component (owner of the real one: #2 skeleton; stable contract).
 * Page frame used by every screen: brand header, optional back button, title, subtitle,
 * content and the "Fonte: TSE" footer.
 */
export interface PageFrameProps {
  base: string
  title: string
  subtitle?: string
  /** Back button as drawn in the frame ("‹ Início", "‹ Relatórios", "‹ Fechar"). */
  back?: { label: string; href: string }
  /** Banner above the title, e.g. "EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS". */
  banner?: string
  /** Footer line. Default "Fonte: TSE, dados finais" + "Sobre os dados ›" link. `false` hides it. */
  footer?: { text: string; aboutLink: boolean } | false
  children: Raw | string
}

export const DEFAULT_FOOTER = { text: 'Fonte: TSE, dados finais', aboutLink: true }

export function pageFrame(p: PageFrameProps): Raw {
  const footer = p.footer === undefined ? DEFAULT_FOOTER : p.footer
  return html`<div class="page" data-component="page-frame">
    <header class="app-header">
      <a class="brand" href="${withBase(p.base, '/')}">Voto a Voto</a>
      <span class="app-header__sep" aria-hidden="true"></span>
      <span class="app-header__context">Presidente 2026</span>
    </header>
    ${p.banner ? html`<div class="banner" role="note">${p.banner}</div>` : ''}
    <main class="page__main" id="main">
      ${p.back ? html`<a class="back" href="${p.back.href}">‹ ${p.back.label.replace(/^‹\s*/, '')}</a>` : ''}
      <h1 class="page__title">${p.title}</h1>
      ${p.subtitle ? html`<p class="page__subtitle">${p.subtitle}</p>` : ''}
      ${p.children}
    </main>
    ${footer
      ? html`<footer class="source-footer" data-component="source-footer">${footer.text}${footer.aboutLink ? html` · <a href="${withBase(p.base, '/sobre-os-dados/')}">Sobre os dados ›</a>` : ''}</footer>`
      : ''}
    <div id="consent-slot" data-placeholder="consent-banner" data-ticket="20" hidden></div>
  </div>`
}
