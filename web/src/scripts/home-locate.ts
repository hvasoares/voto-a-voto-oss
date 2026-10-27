/**
 * Home: the optional "Usar minha localização" button. Pre-rendered hidden; shown only where the browser has a
 * position API. Nothing is asked until the tap, and the code that asks (and the city-centre file) loads on that tap.
 */
const box = document.querySelector<HTMLElement>('[data-locate]')
const button = box?.querySelector<HTMLButtonElement>('[data-locate-button]')
const note = box?.querySelector<HTMLElement>('[data-locate-status]')

if (box && button && note && navigator.geolocation) {
  box.hidden = false
  button.addEventListener('click', () => {
    void import('./locate-run').then((m) => m.run(button, note, box.dataset.base ?? '/'))
  })
}
