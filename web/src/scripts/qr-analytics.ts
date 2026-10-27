import { getAnalytics, onAnalyticsReady } from '@/analytics'

/**
 * Events of the Mostrar QR screen (ticket #20), from the inert marker of ticket #9 — the screen stays
 * static (no island): this tiny script listens for the browser's own print command.
 * - qr_screen_shown: once at load, on the demo /qr/ and on every real /:uf/:slug/qr/;
 * - poster_printed: once per print — the print layer of this page IS the poster, so every beforeprint
 *   of this page is one printed poster.
 * Page scripts run before the boot script: the load emission goes through onAnalyticsReady — in an
 * id-configured build the boot installs the provider and the emission flushes; in a no-op build it
 * is absorbed by the no-op analytics.
 */
onAnalyticsReady((a) => a.event('qr_screen_shown'))

window.addEventListener('beforeprint', () => {
  getAnalytics().event('poster_printed')
})