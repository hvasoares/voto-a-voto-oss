import { getAnalytics, setAnalytics, settleAnalyticsWithoutInstall } from '@/analytics'
import { analyticsFor } from '@/analytics/ga4'
import { measurementId } from '@/analytics/id'
import { consent } from '@/lib/consent'

/**
 * Ticket #20 boot: consent, analytics and the banner. A deferred module script on every page
 * (Base.astro). Before consent: nothing — this module never touches Google's URL unless the visitor
 * had granted (a stored choice, or the Aceitar button) AND a measurement ID is configured; with no
 * id it settles as a no-op everywhere and the build/tests stay green.
 *
 * The page scripts of one document run BEFORE this module (Astro emits the page's scripts first), so
 * load-time emissions go through onAnalyticsReady and are resolved by either outcome here: an install
 * flushes them to the provider; a settle resolves them to the no-op WITHOUT ever replaying them after
 * a late grant. Interactions (taps, searches, the banner itself) go through the late-bound proxy.
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

// The one boot verdict, for both the load-time emitters (report_opened, city_view, qr_screen_shown…)
// and the interface: a remembered grant installs the provider; everything else settles as a no-op.
if (store.state() === 'granted') enableAnalytics()
else settleAnalyticsWithoutInstall()

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

// First paint of a fresh visitor (unknown): they see the banner. A remembered refusal keeps it hidden.
if (store.state() === 'unknown') openBanner()
window.addEventListener('resize', fit)
window.addEventListener('orientationchange', fit)