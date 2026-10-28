import { getAnalytics, setAnalytics } from '@/analytics'
import { analyticsFor } from '@/analytics/ga4'
import { measurementId } from '@/analytics/id'
import { notice } from '@/lib/consent'

/**
 * The boot of the NOTICE model (2026-10-27, the g1/Globo-style banner): measurement is implied by the
 * use of the site, so a build with a measurement id installs the provider on EVERY page — no request
 * waits for the banner; the banner (components/ConsentBanner.astro) is informational and one
 * "Prosseguir" stores the acknowledgment so it does not reappear. With no id configured the provider
 * never exists: it settles as a no-op everywhere and the build/tests stay green.
 *
 * The page scripts of one document run BEFORE this module (Astro emits the page's scripts first), so
 * load-time emissions go through onAnalyticsReady and are resolved by the install here, which always
 * happens (or always doesn't): nothing is dropped between page scripts and boot.
 * Interactions (taps, searches, the banner) go through the late-bound proxy.
 */

const store = notice()
const banner = document.querySelector<HTMLElement>('[data-consent-banner]')

const enableAnalytics = (): void => setAnalytics(analyticsFor(measurementId()))
enableAnalytics()
getAnalytics().pageView(location.pathname, document.title)

/* ── The banner ────────────────────────────────────────────────────────────────────────────────── */

// The shell is the banner's parent (Base.astro's min-h-screen column). While the banner is up it is shorter by the banner's height, so a SHORT page keeps its
// footer above the banner without scrolling, and the body padding adds the room a LONG page needs at its end. Both are given back when the banner goes.
const pad = () => {
  if (!banner) return
  const room = banner.offsetHeight
  document.body.style.paddingBottom = `${room}px`
  if (banner.parentElement) banner.parentElement.style.minHeight = `calc(100vh - ${room}px)`
}
const unpad = () => {
  if (!banner) return
  document.body.style.paddingBottom = ''
  if (banner.parentElement) banner.parentElement.style.minHeight = ''
}
// The banner is a fixed bottom bar: it would sit over the page's own footer while open, so the page
// makes matching room while the banner is up: it stays scrollable and clickable.
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

// The single action of the notice: "Prosseguir" records the acknowledgment and the banner goes away.
const acknowledge = () => {
  store.acknowledge()
  closeBanner()
}
banner?.querySelector('[data-consent-continue]')?.addEventListener('click', acknowledge)

// First paint of a fresh visitor (unknown): they see the banner. A remembered acknowledgment keeps it hidden.
if (store.state() === 'unknown') openBanner()
window.addEventListener('resize', fit)
window.addEventListener('orientationchange', fit)