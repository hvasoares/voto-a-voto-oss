/**
 * The desktop shell's behaviour (#51). Base.astro imports this module only when the viewport is 1024 px or wider, so a
 * phone never downloads it, and it is tiny: it wires two things and loads nothing heavy before the first interaction.
 *
 * 1. The top bar's city search. The bar draws a plain pre-rendered field (components/TopBar.astro); on its first focus
 *    this mounts the existing CitySearch component (React + cmdk, the same one Home uses) in its place and hands it
 *    what was typed, so the cost is paid only by the visitors who search.
 * 2. "/" focuses the city search: the page's own (Home) when it is visible, otherwise the top bar's. Typing "/" inside
 *    any field is left alone.
 */
const host = document.querySelector<HTMLElement>('[data-topbar-search]')

if (host) {
  const events = ['focusin', 'pointerdown', 'keydown']
  const mount = async (): Promise<void> => {
    for (const e of events) host.removeEventListener(e, mount)
    const typed = host.querySelector('input')?.value ?? ''
    try {
      // A sibling entry the build emits (integrations/desktop-shell.ts), addressed by file name so this module needs no bundler preload helper.
      const file = import.meta.env.DEV ? 'topbar-search.ts' : 'topbar-search.js'
      const { mount } = (await import(/* @vite-ignore */ new URL(file, import.meta.url).href)) as typeof import('./topbar-search')
      mount(host, typed)
    } catch (error) {
      // The pre-rendered field stays; say so where Home says it (the page's own search shows the same note).
      console.error('top bar search failed to load', error)
    }
  }
  for (const e of events) host.addEventListener(e, mount, { once: true })
}

const visible = (el: HTMLInputElement) => el.getClientRects().length > 0

addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
  if ((e.target as Element | null)?.closest('input, textarea, select, [contenteditable]')) return
  const fields = ['main', 'bar'].flatMap((kind) => [...document.querySelectorAll<HTMLInputElement>(`[data-city-search="${kind}"] input`)])
  const field = fields.find(visible)
  if (!field) return
  e.preventDefault()
  field.focus()
})
