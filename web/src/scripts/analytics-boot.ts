import { getAnalytics, setAnalytics } from '@/analytics'
import { analyticsFor } from '@/analytics/ga4'
import { measurementId } from '@/analytics/id'
import { consent } from '@/lib/consent'

/**
 * Ticket #20 boot: consent, analytics and the banner. A deferred module script on every page (Base.astro),
 * so it runs before the other page scripts and islands — with a REMEMBERED consent the GA4 provider is
 * already installed when they emit; without one everything they emit hits the no-op analytics and is
 * dropped: nothing is ever queued to replay after a late grant.
 *
 * Before consent: nothing. This module never touches Google's URL unless the visitor had granted
 * (stored choice or the Aceitar button) AND a measurement ID is configured — with no id it is a no-op
 * everywhere and the build/test suites stay green.
 */

const store = consent()
const banner = document.querySelector<HTMLElement>('[data-consent-banner]')

let installed = false
function enableAnalytics(): void {
  if (installed) return
  installed = true
  setAnalytics(analyticsFor('granted', measurementId()))
  // The consent decision may come after the page load (banner "Aceitar"): the CURRENT page view still
  // leaves now, exactly once, through the provider. Events emitted before the grant are not replayed.
  getAnalytics().pageView(location.pathname, document.title)
}

/* ── The banner ────────────────────────────────────────────────────────────────────────────────── */

const pad = () => {
  if (banner) document.body.style.paddingBottom = `${banner.offsetHeight}px`
}
const unpad = () => {
  if (banner) document.body.style.paddingBottom = ''
}
// The banner is a fixed bottom bar: it would sit over the page's own footer while open, so the body
// gains matching bottom padding while the choice is pending — the page stays scrollable and clickable.
const fit = () => {
  if (banner && !banner.hidden) pad()
}
const openBanner = () => {
  if (!banner) return
  banner.hidden = false
  pad()
}
const closeBanner = () => {
  if (!banner) return
  banner.hidden = true
  unpad()
}

/* ── Decision wiring ────────────────────────────────────────────────────────────────────────────── */

// A reset (the "Alterar consentimento" button on the privacy section) shows the banner again.
store.onChange((state) => {
  if (state === 'unknown') {
    const previous = banner?.dataset.consentPrevious
    const status = banner?.querySelector('[data-consent-status]')
    if (status && previous) {
      status.textContent = previous === 'granted' ? 'Você havia aceitado as métricas de uso.' : 'Você havia recusado as métricas de uso.'
      status.removeAttribute('hidden')
    }
    openBanner()
  }
  if (state === 'granted') enableAnalytics()
  if (state !== 'unknown') closeBanner()
})

banner?.querySelector('[data-consent-accept]')?.addEventListener('click', () => store.choose('granted'))
banner?.querySelector('[data-consent-refuse]')?.addEventListener('click', () => store.choose('refused'))

// The consent-change affordances: the about page's button (footers link there through this base path).
document.querySelectorAll('[data-consent-change]').forEach((el) =>
  el.addEventListener('click', () => {
    const status = banner?.querySelector('[data-consent-status]')
    const previous = store.state()
    if (previous !== 'unknown' && banner) banner.dataset.consentPrevious = previous
    // A second change: clear the note so the banner reads like the first visit.
    if (status) status.setAttribute('hidden', '')
    store.reset()
  }),
)

// First paint of a remembered state; a fresh visitor (unknown) sees the banner.
if (store.state() === 'unknown') openBanner()
if (store.state() === 'granted') enableAnalytics()
window.addEventListener('resize', fit)
window.addEventListener('orientationchange', fit)