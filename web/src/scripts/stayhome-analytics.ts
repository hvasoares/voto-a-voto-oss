import { onAnalyticsReady } from '@/analytics'

/**
 * Plain-HTML script of "Ficaram em casa" (#32): on load, `stayhome_opened {ciclo, turno}` (the page carries `data-ano` and `data-turno`). It goes through
 * `onAnalyticsReady` like the reports' script: page scripts run before the analytics boot, so the emission flushes in a build with a measurement id and is
 * absorbed in a build without one. Not an island: the share island below the map loads only when it scrolls into view.
 */
const main = document.querySelector<HTMLElement>('[data-page="mapa-ficaram-em-casa"]')
if (main) onAnalyticsReady((a) => a.event('stayhome_opened', { ciclo: Number(main.dataset.ano), turno: Number(main.dataset.turno) }))
