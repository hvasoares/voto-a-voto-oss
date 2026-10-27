import { getAnalytics } from '@/analytics'

/**
 * Events of the Mostrar QR screen (ticket #20), from the inert marker of ticket #9 — the screen stays
 * static (no island): this tiny script listens for the browser's own print command.
 * - qr_screen_shown: once at load, on the demo /qr/ and on every real /:uf/:slug/qr/;
 * - poster_printed: once per print — the print layer of this page IS the poster, so every beforeprint
 *   of this page is one printed poster.
 * With no consent both hit the no-op analytics and nothing is sent.
 */
getAnalytics().event('qr_screen_shown')

window.addEventListener('beforeprint', () => {
  getAnalytics().event('poster_printed')
})