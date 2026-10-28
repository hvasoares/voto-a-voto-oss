import { useEffect, useState } from 'react'
import { SHARD_VERSION } from 'virtual:data-shards'
import { Button } from '@/components/ui/button'
import PlacePicker, { type PickedPlace } from '@/components/PlacePicker'
import { withBase } from '@/paths'
import type { CityShard } from '@/lib/city-shard'
import { widgetSnippet, widgetUrl, WIDGET_HEIGHT } from '@/lib/widget'
import { displayName } from '@/shared/city-search'

/**
 * The page where a newsroom or an association gets the widget of a city (#29): pick the city (or arrive with `?cidade=rj/x`), see the widget
 * at 390 and at 320 px wide, copy the one-line snippet. The previews are the real widget pages in frames; the snippet carries the site's
 * public address. Nothing is stored or sent: the only requests are the city's own shard and the previews.
 */
export interface WidgetBuilderProps {
  base: string
  origin: string
}

const CITY = /^([a-z]{2})\/([a-z0-9]+(?:-[a-z0-9]+)*)$/

export default function WidgetBuilder({ base, origin }: WidgetBuilderProps) {
  const [city, setCity] = useState<{ uf: string; slug: string }>()
  const [name, setName] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const m = CITY.exec(new URLSearchParams(location.search).get('cidade') ?? '')
    if (m) setCity({ uf: m[1]!, slug: m[2]! })
  }, [])

  useEffect(() => {
    setName(undefined)
    setFailed(false)
    if (!city) return
    let live = true
    fetch(withBase(base, `data/v${SHARD_VERSION}/city/${city.uf}/${city.slug}.json`))
      .then((res) => (res.ok ? (res.json() as Promise<CityShard>) : Promise.reject(new Error(`city shard: HTTP ${res.status}`))))
      .then((shard) => live && setName(displayName(shard.city.nome)))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [city, base])

  const pick = (p: PickedPlace) => {
    setCity({ uf: p.uf, slug: p.slug })
    setStatus('')
    history.replaceState(null, '', `${location.pathname}?cidade=${p.uf}/${p.slug}`)
  }

  const snippet = city && name ? widgetSnippet({ url: widgetUrl(origin, base, city.uf, city.slug), cityName: name }) : undefined
  const src = city ? withBase(base, `embed/${city.uf}/${city.slug}/`) : undefined

  const copy = () => {
    if (!snippet) return
    void navigator.clipboard.writeText(snippet).then(
      () => setStatus('Snippet copiado.'),
      () => setStatus('Não foi possível copiar. Selecione o snippet acima e copie.'),
    )
  }

  const label = 'mt-3 text-step-1 uppercase tracking-[0.04em] text-muted-foreground'
  return (
    <div data-widget-builder data-ready={snippet ? 'yes' : 'no'}>
      <div className="mt-3">
        <PlacePicker base={base} label="Cidade" value={city && name ? { ...city, nome: name } : undefined} onPick={pick} />
      </div>
      {failed && <p className="mt-2 text-step-1" role="status">Não foi possível carregar os dados desta cidade agora.</p>}
      {!city && <p className="mt-3 text-step-1 text-muted-foreground" data-placeholder>Escolha uma cidade para ver o widget.</p>}

      {src && name && (
        <>
          <p className={label}>Prévia · 390 px</p>
          <iframe className="mt-1 block max-w-full border-0" src={src} width="390" height={WIDGET_HEIGHT} title={`Prévia do widget de ${name}, 390 px`} data-preview="390" />
          <p className={label}>Prévia · 320 px</p>
          <iframe className="mt-1 block max-w-full border-0" src={src} width="320" height={WIDGET_HEIGHT} title={`Prévia do widget de ${name}, 320 px`} data-preview="320" />
        </>
      )}

      {snippet && (
        <>
          <p className={label}>Snippet</p>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-foreground p-3 font-mono text-step-1 text-background" data-snippet>{snippet}</pre>
          <Button className="mt-3 min-h-12 w-full rounded-md text-step-2 font-bold text-primary-foreground" onClick={copy} data-act="copy-snippet">
            Copiar snippet
          </Button>
          <p className="mt-1 min-h-6 text-step-1 text-muted-foreground" role="status" aria-live="polite" data-status>{status}</p>
        </>
      )}
    </div>
  )
}
