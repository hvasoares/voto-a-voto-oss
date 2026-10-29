import { useEffect, useMemo, useRef, useState } from 'react'
import { getAnalytics } from '@/analytics'
import { linkHref } from '@/paths'
import { createSearchController } from '@/slots/home/search-ui'
import { Card } from '@/components/ui/card'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { loadSearchCities } from '@/lib/search-data'
import { readPlace, savePlace } from '@/lib/place-store'
import { cityTarget, landingDestination, readDestination, type Destination } from '@/lib/destinations'
import { useIslandReady } from './use-island-ready'

/** One `search` event once typing pauses, not one per keystroke (same as the vanilla home). */
const DEBOUNCE_MS = 600
/** The Sketch search field (48 px, 1 px rule border, 4 px radius, 20 px icon) on top of shadcn's CommandInput / InputGroup. */
const FIELD = [
  '[&_[data-slot=command-input-wrapper]]:p-0',
  '[&_[data-slot=input-group]]:h-12! [&_[data-slot=input-group]]:rounded-md! [&_[data-slot=input-group]]:border-border [&_[data-slot=input-group]]:bg-transparent',
  // the Sketch magnifier is drawn below (the icon of shadcn's CommandInput is hidden)
  '[&_[data-slot=input-group-addon]]:hidden',
].join(' ')
const SHORT = { state: 'short', total: 0, hits: [] } as const

/** The slim header variant (#51, #153): a 44 px field on a phone, 40 px in the desktop top bar, the results float over the page instead of pushing it. */
const BAR_FIELD = '[&_[data-slot=input-group]]:h-11! lg:[&_[data-slot=input-group]]:h-10!'
const BAR_LIST = 'absolute inset-x-0 top-full z-30'

/**
 * The city search: shadcn Command (cmdk) with filtering turned off, because the ranking is ours
 * (site/src/shared/city-search.ts, reused unchanged). Hydrated on first interaction (client:interaction).
 * Analytics payloads come from the shared controller: result count and query length, never the typed text.
 */
export default function CitySearch({ base, bar = false, initialText = '', autoFocus = false }: { base: string; bar?: boolean; initialText?: string; autoFocus?: boolean }) {
  const [text, setText] = useState(initialText)
  const [cities, setCities] = useState<Awaited<ReturnType<typeof loadSearchCities>>>()
  const [destination, setDestination] = useState<Destination>()
  const root = useRef<HTMLDivElement>(null)
  const island = useIslandReady('city-search')

  // First interaction = first render in the browser: load the cities now, and keep what was typed before React took over.
  useEffect(() => {
    // The destination (#99) is read before the cities arrive, so a result can never be drawn without it. Only the page's own search takes it.
    if (!bar) setDestination(readDestination(location.search))
    // data-ready: yes once the search index answered; a search.json that cannot be read is the terminal failure.
    loadSearchCities(base).then(
      (loadedCities) => {
        setCities(loadedCities)
        island.markReady()
      },
      () => island.markFailed('search.json'),
    )
    const typed = root.current?.querySelector('input')?.value || root.current?.closest('astro-island')?.getAttribute('data-pending')
    if (typed) setText(typed)
    if (autoFocus || (!bar && landingDestination(location.search, readPlace()?.kind === 'city'))) root.current?.querySelector('input')?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, bar, autoFocus])

  const controller = useMemo(() => (cities ? createSearchController(cities, getAnalytics()) : undefined), [cities])
  const view = useMemo(() => controller?.search(text, false) ?? SHORT, [controller, text])

  useEffect(() => {
    if (!controller) return
    const t = setTimeout(() => controller.search(text, true), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [controller, text])

  const href = (uf: string, slug: string) => linkHref(cityTarget(uf, slug, destination), base)

  return (
    <div ref={root} className={bar ? 'relative' : 'relative mt-2'} data-city-search={bar ? 'bar' : 'main'} data-ready={island.dataReady} data-error={island.dataError} data-destination={destination}>
      <svg className={`pointer-events-none absolute left-[14px] z-10 text-muted-foreground ${bar ? 'top-[12px] lg:top-[10px]' : 'top-[12px] lg:hidden'}`} viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="6.5" cy="6.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M16.2 12.2 12.4 16.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
      <Command
        shouldFilter={false}
        label={bar ? 'Ver minha cidade' : 'Busque sua cidade'}
        className={`h-auto overflow-visible rounded-none bg-transparent p-0 ${FIELD} ${bar ? BAR_FIELD : ''}`}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          root.current?.querySelector<HTMLAnchorElement>('a[data-position]')?.click()
        }}
      >
        <CommandInput
          value={text}
          onValueChange={setText}
          className={`h-full pl-[39px]! text-step-2! placeholder:text-muted-foreground ${bar ? 'pr-10!' : 'pb-1 lg:pl-[22px]!'}`}
          placeholder={bar ? 'Ver minha cidade' : 'Busque sua cidade'}
          aria-label={bar ? 'Ver minha cidade' : 'Busque sua cidade'}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        <CommandList className={bar ? `max-h-none ${BAR_LIST}` : 'max-h-none'} hidden={view.state !== 'results'}>
          {view.state === 'results' && (
            <Card className="mt-1 gap-0 rounded-md border border-border bg-background p-0 py-0 shadow-none ring-0">
              {view.hits.map((h, i) => (
                <CommandItem
                  key={`${h.uf}/${h.slug}`}
                  value={`${h.uf}/${h.slug}`}
                  className="gap-0 rounded-none p-0 not-first:border-t not-first:border-border [&>svg]:hidden"
                >
                  <a
                    href={href(h.uf, h.slug)}
                    data-position={i + 1}
                    data-uf={h.uf}
                    className="flex min-h-12 flex-1 items-center justify-between gap-3 px-3 text-foreground"
                    onClick={() => {
                      controller?.resultTap(i + 1, h.uf)
                      savePlace({ kind: 'city', uf: h.uf, slug: h.slug, nome: h.nome })
                    }}
                  >
                    <span className="text-step-2 font-bold wrap-anywhere">{h.nome}</span>
                    <span className="flex-none text-step-1 text-muted-foreground">{h.ufLabel}</span>
                  </a>
                </CommandItem>
              ))}
            </Card>
          )}
        </CommandList>
      </Command>
      <div aria-live="polite" className={bar ? BAR_LIST : undefined}>
        {view.state === 'empty' && <p className="mt-2 text-step-1 text-muted-foreground">Nenhuma cidade encontrada. Confira a grafia ou escolha um estado abaixo.</p>}
        {view.state === 'results' && view.total > view.hits.length && (
          <p className="mt-2 text-step-1 text-muted-foreground">Mostrando {view.hits.length} de {view.total}. Digite mais letras para refinar.</p>
        )}
      </div>
    </div>
  )
}
