import { getAnalytics, onAnalyticsReady } from '@/analytics'

/**
 * Plain-HTML script of the report pages of ticket #12 (no island, no React, like tile-analytics.ts):
 * - on load, event report_opened {report} (the page carries data-report="cidades-que-viraram");
 * - on "Compartilhar", the native share sheet (method "native") or, without it, the link copied to
 *   the clipboard (method "clipboard"), both with event report_shared {report, method};
 * - clipboard copying answers with "Link copiado!" in an aria-live status, so the visitor sees it worked.
 * A visitor who cancels the native sheet (or denies clipboard permission) shares nothing and gets no event.
 * The load emission goes through onAnalyticsReady: page scripts run before the boot, which installs the
 * provider in an id-configured build — the emission flushes; in a no-op build it is absorbed.

 */
const main = document.querySelector<HTMLElement>('[data-report]')
onAnalyticsReady((a) => a.event('report_opened', { report: main?.dataset.report ?? '' }))

const feedback = document.querySelectorAll('[data-share-feedback]')

function show(text: string): void {
  feedback.forEach((el) => (el.textContent = text))
}

document.querySelectorAll('[data-share-report]').forEach((button) => button.addEventListener('click', () => {
  const report = main?.dataset.report ?? ''
  // A report with its own share sentence (Cidades fora da curva: the screening text) carries it in data-share-text.
  const text = (button as HTMLElement).dataset.shareText
  const data = { title: document.title, text: text ?? document.title, url: location.origin + location.pathname }
  if (typeof navigator.share === 'function') {
    navigator
      .share(data)
      .then(() => getAnalytics().event('report_shared', { report, method: 'native' }))
      .catch(() => {}) // cancelled by the visitor: no event, no feedback
    return
  }
  navigator.clipboard
    .writeText(text ? `${text} ${data.url}` : data.url)
    .then(() => {
      show('Link copiado!')
      getAnalytics().event('report_shared', { report, method: 'clipboard' })
    })
    .catch(() => show('Não foi possível copiar o link.'))
}))
