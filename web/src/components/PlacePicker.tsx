import { useEffect, useId, useMemo, useState } from 'react'
import { buildIndex, fold, MIN_QUERY, searchCities, type SearchHit } from '@/shared/city-search'
import { loadSearchCities } from '@/lib/search-data'
import { Card } from '@/components/ui/card'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

/** The Sketch field (about 46 px, 1 px rule border, 4 px radius) on top of shadcn's CommandInput, as in the home search. */
const FIELD = [
  '[&_[data-slot=command-input-wrapper]]:p-0',
  '[&_[data-slot=input-group]]:h-[44px]! [&_[data-slot=input-group]]:rounded-md! [&_[data-slot=input-group]]:border-border [&_[data-slot=input-group]]:bg-background',
  '[&_[data-slot=input-group-addon]]:hidden',
].join(' ')

/** A city the visitor picked: what the pages of the site call a place. */
export interface PickedPlace {
  uf: string
  slug: string
  /** Display name. */
  nome: string
}

export interface PlacePickerProps {
  base: string
  /** The small label over the field ("Cidade", "Onde mora"). */
  label: string
  value?: PickedPlace
  onPick: (place: PickedPlace) => void
  /** When given, a "×" clears the place (Meu Brasil's three optional places). */
  onClear?: () => void
  /** Text shown while no place is chosen. */
  placeholder?: string
  /** The label sits inside the field, over a bold value (Meu Brasil's rows); otherwise above it, over a regular value (the generator). */
  inside?: boolean
}

/**
 * The city field of the card pages (#25 generator, #27 Meu Brasil): the same ranking as the home search
 * (`shared/city-search.ts`, the pre-rendered search shard, loaded only when the field is first used), but a pick fills the
 * field instead of opening the city. The typed text is never sent anywhere.
 */
export default function PlacePicker({ base, label, value, onPick, onClear, placeholder = 'Busque uma cidade', inside = false }: PlacePickerProps) {
  const [text, setText] = useState<string | undefined>()
  const [cities, setCities] = useState<Awaited<ReturnType<typeof loadSearchCities>>>()
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const listId = useId()
  const shown = text ?? (value ? `${value.nome} · ${value.uf === 'zz' ? 'Exterior' : value.uf.toUpperCase()}` : '')

  const load = () => {
    if (cities || failed) return
    loadSearchCities(base).then(setCities, () => setFailed(true))
  }
  const index = useMemo(() => (cities ? buildIndex(cities) : undefined), [cities])
  const result = useMemo(() => (index && text !== undefined ? searchCities(index, text, { limit: 8 }) : { total: 0, hits: [] as SearchHit[] }), [index, text])
  const typed = text !== undefined && fold(text).length >= MIN_QUERY
  useEffect(() => setOpen(typed), [typed, text])

  const pick = (h: SearchHit) => {
    onPick({ uf: h.uf, slug: h.slug, nome: h.nome })
    setText(undefined)
    setOpen(false)
  }

  return (
    <div className="relative" data-place-picker>
      <Command shouldFilter={false} label={label} className={`h-auto overflow-visible rounded-none bg-transparent p-0 ${FIELD}`} onKeyDown={(e) => e.key === 'Escape' && (setText(undefined), setOpen(false))}>
        {inside ? (
          <span className="pointer-events-none absolute left-3 top-[6px] z-10 text-[10px] uppercase leading-3 tracking-[0.04em] text-muted-foreground">{label}</span>
        ) : (
          <span className="mb-1 block text-[10px] uppercase leading-3 tracking-[0.04em] text-muted-foreground" aria-hidden="true">{label}</span>
        )}
        <div className="relative">
          <CommandInput
            value={shown}
            onValueChange={(v) => setText(v)}
            onFocus={(e) => {
              load()
              e.currentTarget.select()
            }}
            aria-label={label}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            className={inside ? "h-full px-3 pt-[14px] pb-0 text-body! font-bold leading-[18px]" : "h-full px-3 text-body! leading-[18px]"}
          />
          {onClear && value && (
            <button type="button" className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-muted-foreground" aria-label={`Remover ${label.toLowerCase()}`} onClick={onClear}>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false"><path d="M1 1 11 11M11 1 1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          )}
        </div>
        <CommandList id={listId} className="max-h-none" hidden={!open || result.hits.length === 0}>
          {open && result.hits.length > 0 && (
            <Card className="mt-1 gap-0 rounded-md border border-border bg-background p-0 py-0 shadow-none ring-0" data-place-results>
              {result.hits.map((h) => (
                <CommandItem key={`${h.uf}/${h.slug}`} value={`${h.uf}/${h.slug}`} onSelect={() => pick(h)} className="min-h-12 justify-between gap-3 rounded-none px-3 not-first:border-t not-first:border-border [&>svg]:hidden" data-place-option>
                  <span className="text-body font-bold leading-[18px] wrap-anywhere">{h.nome}</span>
                  <span className="flex-none text-small text-muted-foreground">{h.ufLabel}</span>
                </CommandItem>
              ))}
            </Card>
          )}
        </CommandList>
      </Command>
      <div aria-live="polite">
        {failed && <p className="mt-1 text-small leading-4 text-muted-foreground">A busca não está disponível agora.</p>}
        {typed && index && result.total === 0 && <p className="mt-1 text-small leading-4 text-muted-foreground">Nenhuma cidade encontrada. Confira a grafia.</p>}
      </div>
    </div>
  )
}
