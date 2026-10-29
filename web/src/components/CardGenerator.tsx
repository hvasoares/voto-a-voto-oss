import { useEffect, useMemo, useRef, useState } from 'react'
import { SHARD_VERSION } from 'virtual:data-shards'
import { getAnalytics } from '@/analytics'
import { Button } from '@/components/ui/button'
import PlacePicker, { type PickedPlace } from '@/components/PlacePicker'
import { linkHref } from '@/paths'
import type { CityShard } from '@/lib/city-shard'
import { DEFAULT_LOCALE, message } from '@/lib/sentences/catalog'
import { MEASURES, type Measure } from '@/lib/sentences/stat'
import { statContent } from '@/lib/stat-content'
import { readRegister } from '@/lib/sentences/register-store'
import { choiceQuery, DOWNLOAD_LABELS, MEASURE_LABELS, parseChoice, SIZE_LABELS, type GeneratorChoice } from '@/lib/generator-model'
import { performShare, type ShareNavigator } from '@/lib/share-flow'
import { saveBlob, svgToPng } from '@/lib/share-raster'
import { STAT_SIZES, STAT_SIZE_IDS, type StatSize } from '@/lib/stat-card'
import { displayName } from '@/shared/city-search'
import { useIslandReady } from './use-island-ready'

/**
 * The card generator (#25): pick a city, one measure and a size; the picture is drawn here, in the browser, by `statCardSvg`
 * (the sibling of the share sheet's `shareCardSvg`) from this city's own shard. Nothing is sent anywhere.
 *
 * Like the share sheet, the PNG is made ahead of the tap (whenever the picture changes), because `navigator.share` must be
 * reached inside the user gesture. Where files cannot be shared the same button downloads the image, and the alt text can always
 * be copied. `data-ready` follows the shared island vocabulary (#122): no until a card is drawn, yes once and for all; a city
 * whose shard fails keeps its inline message (a new pick recovers) instead of the terminal `failed`.
 */
export interface CardGeneratorProps {
  base: string
  origin: string
  /** Fictitious data (manifest.fixture). */
  fixture: boolean
  /** The id of the data edition: the picture carries it with its other keys (#38). */
  edition: string
}

const PREVIEW_WIDTH: Record<StatSize, string> = { square: 'max-w-[220px]', story: 'max-w-[124px]', preview: 'max-w-[300px]' }
const MESSAGES = {
  downloaded: 'Imagem baixada. Copie o texto alternativo abaixo para colar na publicação.',
  fellBack: 'Não foi possível abrir o compartilhamento. A imagem foi baixada.',
  failed: 'Não foi possível compartilhar agora. Tente "Baixar imagem".',
  downloadFailed: 'Não foi possível baixar a imagem.',
  altCopied: 'Texto alternativo copiado.',
  altFailed: 'Não foi possível copiar. Selecione o texto e copie:',
  loadFailed: 'Não foi possível carregar os dados desta cidade agora.',
} as const

type Loaded = { state: 'idle' } | { state: 'loading' } | { state: 'failed' } | { state: 'ready'; shard: CityShard }

export default function CardGenerator({ base, origin, fixture, edition }: CardGeneratorProps) {
  const [choice, setChoice] = useState<GeneratorChoice>({ measure: 'nonVoters', size: 'square' })
  const [place, setPlace] = useState<PickedPlace>()
  const [loaded, setLoaded] = useState<Loaded>({ state: 'idle' })
  const [status, setStatus] = useState('')
  const [file, setFile] = useState<File>()
  const [canShare, setCanShare] = useState(true)
  const [mounted, setMounted] = useState(false)
  const readyRef = useRef<Promise<File | undefined>>(Promise.resolve(undefined))

  // The address asks for a choice (the share dialog links here with the city): read it once, in the browser.
  useEffect(() => {
    const asked = parseChoice(location.search)
    setChoice(asked)
    setMounted(true)
    setCanShare(typeof navigator.share === 'function')
    getAnalytics().event('card_generator_opened', { has_city: !!asked.city })
  }, [])

  // A chosen city is fetched as its own shard (the same file the city card reads), nothing else.
  const cityKey = choice.city ? `${choice.city.uf}/${choice.city.slug}` : undefined
  useEffect(() => {
    if (!cityKey) return setLoaded({ state: 'idle' })
    let live = true
    setLoaded({ state: 'loading' })
    fetch(linkHref(`data/v${SHARD_VERSION}/city/${cityKey}.json`, base))
      .then((res) => (res.ok ? (res.json() as Promise<CityShard>) : Promise.reject(new Error(`city shard: HTTP ${res.status}`))))
      .then((shard) => live && setLoaded({ state: 'ready', shard }))
      .catch(() => live && setLoaded({ state: 'failed' }))
    return () => {
      live = false
    }
  }, [cityKey, base])

  const card = useMemo(() => {
    if (loaded.state !== 'ready') return undefined
    const { shard } = loaded
    const content = statContent(shard, { measure: choice.measure, size: choice.size, register: readRegister(), origin, base, fixture, edition })
    return { ...content, city: shard.city }
  }, [loaded, choice.measure, choice.size, origin, base, fixture, edition])

  // The PNG is made as soon as the picture changes, so Compartilhar can reach navigator.share inside the tap.
  useEffect(() => {
    setFile(undefined)
    if (!card?.svg) return
    const ready = svgToPng(card.svg, card.filename, STAT_SIZES[choice.size]).catch(() => undefined)
    readyRef.current = ready
    let live = true
    void ready.then((f) => live && setFile(f))
    return () => {
      live = false
    }
  }, [card?.svg, card?.filename, choice.size])

  const update = (next: GeneratorChoice) => {
    setChoice(next)
    history.replaceState(null, '', `${location.pathname}${choiceQuery(next)}`)
  }
  const pickCity = (p: PickedPlace) => {
    setPlace(p)
    update({ ...choice, city: { uf: p.uf, slug: p.slug } })
  }
  const pickSize = (size: StatSize) => {
    if (size !== choice.size) getAnalytics().event('card_size_chosen', { size })
    update({ ...choice, size })
  }

  const download = async () => {
    const f = file ?? (await readyRef.current)
    if (f) saveBlob(f, f.name)
    else if (card?.svg) saveBlob(new Blob([card.svg], { type: 'image/svg+xml' }), card.filename.replace(/\.png$/, '.svg'))
  }
  const onDownload = () =>
    void download().then(
      () => {
        getAnalytics().event('card_image_downloaded', { size: choice.size, measure: choice.measure })
        setStatus(MESSAGES.downloaded)
      },
      () => setStatus(MESSAGES.downloadFailed),
    )
  const onDownloadSvg = () => {
    if (!card?.svg) return
    saveBlob(new Blob([card.svg], { type: 'image/svg+xml;charset=utf-8' }), card.filename.replace(/\.png$/, '.svg'))
    getAnalytics().event('card_svg_downloaded', { size: choice.size, measure: choice.measure })
  }
  const onShare = () => {
    if (!card) return
    void performShare({ nav: navigator as ShareNavigator, file, text: `${card.stat.alt} ${card.url}`, download }).then((r) => {
      if (r.status === 'shared') getAnalytics().event('share_completed', { method: r.method })
      if (r.status === 'cancelled') getAnalytics().event('share_cancelled')
      if (r.status === 'downloaded' || (r.status === 'failed' && r.fellBack)) getAnalytics().event('card_image_downloaded', { size: choice.size, measure: choice.measure })
      if (r.status === 'failed' && !r.fellBack) getAnalytics().event('share_failed', { method: r.method })
      setStatus(r.status === 'downloaded' ? MESSAGES.downloaded : r.status === 'failed' ? (r.fellBack ? MESSAGES.fellBack : r.method === 'download' ? MESSAGES.downloadFailed : MESSAGES.failed) : '')
    })
  }
  const onCopyAlt = () => {
    if (!card) return
    void navigator.clipboard.writeText(card.stat.alt).then(
      () => setStatus(MESSAGES.altCopied),
      () => setStatus(`${MESSAGES.altFailed} ${card.stat.alt}`),
    )
  }

  const ready = !!card?.svg
  const island = useIslandReady('card-generator')
  useEffect(() => {
    if (ready) island.markReady()
  }, [ready, island.markReady])
  const BTN = 'min-h-11 w-full rounded-md text-step-2 font-bold'
  const chip = (on: boolean) => `min-h-11 flex-none whitespace-nowrap rounded-full border px-2 text-step-1 font-bold ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground'}`

  return (
    <div data-card-generator data-ready={island.dataReady} data-size={choice.size} data-measure={choice.measure} data-hydrated={mounted ? 'yes' : 'no'}>
      <PlacePicker base={base} label="Cidade" value={place ?? (card ? { uf: card.city.uf, slug: card.city.slug, nome: displayName(card.city.nome) } : undefined)} onPick={pickCity} placeholder="Busque uma cidade" />

      <p className="mt-3 text-step-1 uppercase tracking-[0.04em] text-muted-foreground" id="gen-measure">Medida</p>
      <div className="mt-1 flex gap-1" role="radiogroup" aria-labelledby="gen-measure">
        {MEASURES.map((m: Measure) => (
          <button key={m} type="button" role="radio" aria-checked={choice.measure === m} className={chip(choice.measure === m)} onClick={() => update({ ...choice, measure: m })} data-measure-option={m}>
            {MEASURE_LABELS[m]}
          </button>
        ))}
      </div>

      <p className="mt-3 text-step-1 uppercase tracking-[0.04em] text-muted-foreground" id="gen-size">Tamanho</p>
      <div className="mt-1 flex rounded-md bg-secondary p-0.5" role="radiogroup" aria-labelledby="gen-size">
        {STAT_SIZE_IDS.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={choice.size === s} className={`min-h-11 flex-1 rounded text-step-1 ${choice.size === s ? 'bg-primary font-bold text-primary-foreground' : 'text-muted-foreground'}`} onClick={() => pickSize(s)} data-size-option={s}>
            {SIZE_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex min-h-[200px] items-center justify-center" data-preview>
        {card?.svg ? (
          <div className={`w-full ${PREVIEW_WIDTH[choice.size]} [&>svg]:block [&>svg]:h-auto [&>svg]:w-full`} data-preview-picture dangerouslySetInnerHTML={{ __html: card.svg }} />
        ) : loaded.state === 'ready' && card ? (
          <p className="text-step-2" data-nodata>{message({ locale: DEFAULT_LOCALE, register: 'standard' }, 'noData')}</p>
        ) : (
          <p className="text-step-1 text-muted-foreground" data-placeholder role="status">
            {loaded.state === 'loading' ? 'Carregando…' : loaded.state === 'failed' ? MESSAGES.loadFailed : 'Escolha uma cidade para ver o cartão.'}
          </p>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        <Button className={`${BTN} text-primary-foreground`} disabled={!ready} onClick={onDownload} data-act="download">
          {DOWNLOAD_LABELS[choice.size]}
        </Button>
        <Button variant="outline" className={`${BTN} border border-border bg-background text-primary`} disabled={!ready} onClick={onShare} data-act="share">
          {canShare ? 'Compartilhar' : 'Compartilhar (baixa a imagem)'}
        </Button>
        <button type="button" className="min-h-11 text-step-1 font-bold text-primary disabled:opacity-50" disabled={!ready} onClick={onCopyAlt} data-act="copy-alt">
          Copiar texto alternativo
        </button>
        <button type="button" className="min-h-11 text-step-1 text-primary underline disabled:opacity-50" disabled={!ready} onClick={onDownloadSvg} data-act="download-svg">
          Baixar em SVG (com texto, para leitores de tela)
        </button>
      </div>
      <p className="min-h-6 text-step-1 text-muted-foreground" role="status" aria-live="polite" data-status>
        {status}
      </p>
    </div>
  )
}
