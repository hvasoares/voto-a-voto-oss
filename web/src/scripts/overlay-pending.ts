/**
 * Keeps a choice tapped on the overlay builder before React is live (#68, found by a CI flake): the island is served static, so a tap on a Medida / Ciclo / Tamanho / Fundo
 * button can land before hydration and was simply lost. The page script records each tapped `data-option` ("Medida:margem") in order on the island root
 * (`data-pending-options`, separated by a vertical bar); the builder applies them right after hydration, on top of the address, and deletes the attribute.
 */
export {}

document.addEventListener(
  'click',
  (e) => {
    const option = (e.target as Element | null)?.closest('[data-option]')
    const host = option?.closest('astro-island') as HTMLElement | null
    if (!option || !host?.hasAttribute('ssr')) return
    const kept = host.dataset.pendingOptions
    host.dataset.pendingOptions = `${kept ? `${kept}|` : ''}${option.getAttribute('data-option')}`
  },
  true,
)
