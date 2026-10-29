/**
 * Shared failure step of the island directives (`client:interaction`, `client:panel`, `client:slot`).
 * The island's code could not be loaded or hydrated (for example a CDN that is unreachable or a hash that did not match):
 * the pre-rendered HTML stays as it is, the island root gets `data-failed`, and the `[data-island-failed]` note is revealed
 * (unless `reveal` is false: a panel keeps its server-rendered table and says nothing). Calling it twice changes nothing more.
 */
export function markIslandFailed(el, { reveal = true } = {}) {
  el.dataset.failed = '1'
  if (reveal) document.querySelector('[data-island-failed]')?.removeAttribute('hidden')
}
