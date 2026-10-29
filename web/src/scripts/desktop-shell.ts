/**
 * The desktop shell's behaviour (#51). components/ShellScript.astro loads this module at once on a viewport of 1024 px or wider; a phone
 * loads it only on the first touch of a header search field (#153). It is tiny: it wires two things and loads nothing heavy before the first interaction.
 *
 * 1. The header's city search. The top bar and the phone header draw a plain pre-rendered field (components/HeaderSearch.astro);
 *    on its first focus this mounts the existing CitySearch component (React + cmdk, the same one Home uses) in its place and hands it
 *    what was typed, so the cost is paid only by the visitors who search.
 * 2. "/" focuses the city search: the page's own (Home) when it is visible, otherwise the top bar's. Typing "/" inside
 *    any field is left alone.
 */
const hosts = document.querySelectorAll<HTMLElement>('[data-topbar-search]')
const events = ['focusin', 'pointerdown', 'keydown']

/** Mounts the real search in one header field; a field already touched (a phone: the loader asked for this module on that touch) mounts at once. */
const wire = (host: HTMLElement): void => {
  const mount = async (): Promise<void> => {
    for (const e of events) host.removeEventListener(e, mount)
    try {
      // A sibling entry the build emits (integrations/desktop-shell.ts), addressed by file name so this module needs no bundler preload helper.
      const file = import.meta.env.DEV ? 'topbar-search.ts' : 'topbar-search.js'
      const { mount } = (await import(/* @vite-ignore */ new URL(file, import.meta.url).href)) as typeof import('./topbar-search')
      // Read what was typed only now: keys pressed while the module loaded are still in the plain field.
      mount(host, host.querySelector('input')?.value ?? '')
    } catch (error) {
      // The pre-rendered field stays; say so where Home says it (the page's own search shows the same note).
      console.error('top bar search failed to load', error)
    }
  }
  if (host.contains(document.activeElement)) void mount()
  else for (const e of events) host.addEventListener(e, mount, { once: true })
}
hosts.forEach(wire)

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
