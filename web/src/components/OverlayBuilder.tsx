import { useEffect, useRef, useState } from 'react'
import PlacePicker, { type PickedPlace } from '@/components/PlacePicker'
import { useCityShards } from '@/components/use-city-shards'
import { displayName } from '@/shared/city-search'
import { BACKGROUNDS, DEFAULT_OVERLAY, MEASURES, OVERLAY_CYCLES, OVERLAY_SIZES, overlayQuery, overlaySize, parseOverlay, type OverlayConfig } from '@/lib/overlay'
import { DEFAULT_VOICE, message, type MessageKey } from '@/lib/sentences/catalog'
import '@/lib/sentences/catalog-overlay'
import { withBase } from '@/paths'

/**
 * The overlay builder (#68; the Sketch frame "C2 Overlay para live"): pick a place, a measure, a cycle, a size and a background, see the overlay on a checkerboard and
 * copy its address for the OBS browser source. The source seal is shown as "always on" (a note, not a control). Nothing is sent anywhere and no analytics is called.
 */
export interface OverlayBuilderProps {
  base: string
  origin: string
}

const say = (key: string, params: Record<string, string | number> = {}) => message(DEFAULT_VOICE, key as MessageKey, params)
const CHIP = 'min-h-11 rounded-full border px-4 text-small'
const on = 'border-primary bg-primary text-primary-foreground font-bold'
const off = 'border-border bg-background text-foreground'

function Group<T extends string | number>({ label, options, value, name, onChange }: { label: string; options: readonly T[]; value: T; name: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <div className="mt-4" role="group" aria-label={label}>
      <p className="text-tiny uppercase leading-[14px] text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={String(o)} type="button" aria-pressed={o === value} className={`${CHIP} ${o === value ? on : off}`} onClick={() => onChange(o)} data-option={`${label}:${o}`}>
            {name(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** The configuration after tapping the option `Label:value` (the `data-option` of a button); an unknown one changes nothing. */
function applyOption(c: OverlayConfig, tapped: string): OverlayConfig {
  const [label, value = ''] = tapped.split(':') as [string, string?]
  const found = <T extends string | number>(list: readonly T[]) => list.find((o) => String(o) === value)
  if (label === say('overlay.measure')) return { ...c, measure: found(MEASURES) ?? c.measure }
  if (label === say('overlay.cycle')) return { ...c, ano: found(OVERLAY_CYCLES) ?? c.ano }
  if (label === say('overlay.size')) return { ...c, size: found(OVERLAY_SIZES) ?? c.size }
  if (label === say('overlay.bg')) return { ...c, background: found(BACKGROUNDS) ?? c.background }
  return c
}

export default function OverlayBuilder({ base, origin }: OverlayBuilderProps) {
  const [config, setConfig] = useState<OverlayConfig>(DEFAULT_OVERLAY)
  const [place, setPlace] = useState<PickedPlace>()
  const [status, setStatus] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let c = parseOverlay(location.search)
    // A tap that landed before hydration (kept by scripts/overlay-pending.ts) is applied on top of the address, in the order it was made.
    const host = root.current?.closest('astro-island') as HTMLElement | null
    const pending = host?.dataset.pendingOptions
    if (host) delete host.dataset.pendingOptions
    for (const tapped of pending ? pending.split('|') : []) c = applyOption(c, tapped)
    setConfig(c)
    setReady(true)
    if (c.city) {
      const [uf, slug] = c.city.split('/') as [string, string]
      setPlace({ uf, slug, nome: slug })
    }
  }, [])

  const update = (patch: Partial<OverlayConfig>) => setConfig((c) => ({ ...c, ...patch }))
  const pick = (p: PickedPlace) => {
    setPlace(p)
    update({ city: `${p.uf}/${p.slug}` })
  }
  const shards = useCityShards(base, place ? [`${place.uf}/${place.slug}`] : [])
  const placeShard = place ? shards[`${place.uf}/${place.slug}`] : undefined
  const shownPlace = place && placeShard && placeShard !== 'loading' && placeShard !== 'failed' ? { ...place, nome: displayName(placeShard.city.nome) } : place
  const query = overlayQuery(config)
  const path = `overlay/tela/${query}`
  const address = `${origin}${base.endsWith('/') ? base : `${base}/`}${path}`
  const size = overlaySize(config.size)
  // The preview is the real overlay at its real size, scaled to the width the screen gives it (a phone has about 330 px, a desktop 640).
  const frame = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState(640)
  useEffect(() => {
    const el = frame.current
    if (!el) return
    const measure = () => setRoom(Math.max(120, Math.min(640, el.clientWidth - 32)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const previewScale = Math.min(1, room / size.width, 360 / size.height)

  useEffect(() => {
    try {
      history.replaceState(null, '', query || location.pathname)
    } catch {
      /* the address bar stays as it is */
    }
  }, [query])

  const copy = () => {
    void navigator.clipboard.writeText(address).then(
      () => setStatus(say('overlay.copied')),
      () => setStatus(say('overlay.copy.failed')),
    )
  }

  return (
    <div ref={root} data-builder data-ready={ready ? 'yes' : 'no'} className="mt-3 lg:grid lg:grid-cols-[460px_1fr] lg:gap-10">
      <div>
        <div>
          <PlacePicker base={base} label={say('overlay.place')} value={shownPlace} onPick={pick} />
        </div>
        <Group label={say('overlay.measure')} options={MEASURES} value={config.measure} name={(m) => say(`overlay.m.${m}`)} onChange={(measure) => update({ measure })} />
        <Group label={say('overlay.cycle')} options={OVERLAY_CYCLES} value={config.ano} name={String} onChange={(ano) => update({ ano })} />
        <Group label={say('overlay.size')} options={OVERLAY_SIZES} value={config.size} name={(s) => say(`overlay.size.${s}`)} onChange={(s) => update({ size: s })} />
        <Group label={say('overlay.bg')} options={BACKGROUNDS} value={config.background} name={(b) => say(`overlay.bg.${b}`)} onChange={(background) => update({ background })} />
        <div className="mt-4 rounded-md border border-border bg-[var(--c-paper-2)] p-3" data-seal-note>
          <p className="text-body font-bold leading-[18px]">{say('overlay.seal.on')}</p>
          <p className="text-small leading-[17px] text-muted-foreground">{say('overlay.seal.why')}</p>
        </div>
      </div>
      <div className="mt-6 min-w-0 lg:mt-0">
        <p className="text-tiny uppercase leading-[14px] text-muted-foreground">{say(config.background === 'transparente' ? 'overlay.preview' : 'overlay.preview.other')}</p>
        <div ref={frame} className="mt-1 flex min-h-[200px] items-center justify-center overflow-hidden rounded-md border border-border bg-[length:40px_40px] bg-[linear-gradient(45deg,var(--c-paper-2)_25%,transparent_25%,transparent_75%,var(--c-paper-2)_75%),linear-gradient(45deg,var(--c-paper-2)_25%,#fff_25%,#fff_75%,var(--c-paper-2)_75%)] [background-position:0_0,20px_20px] py-4" data-checker>
          {config.city ? (
            <div style={{ width: size.width * previewScale, height: size.height * previewScale, maxWidth: '100%' }} data-preview-box>
              <iframe title={say('overlay.title')} src={withBase(base, path)} width={size.width} height={size.height} style={{ border: 0, transform: `scale(${previewScale})`, transformOrigin: '0 0', background: 'transparent' }} data-preview />
            </div>
          ) : (
            <p className="rounded bg-background px-3 py-2 text-small" data-placeholder>{say('overlay.preview.empty')}</p>
          )}
        </div>
        <p className="mt-4 text-tiny uppercase leading-[14px] text-muted-foreground">{say('overlay.address')}</p>
        <div className="mt-1 flex gap-2">
          <input readOnly value={config.city ? address : ''} aria-label={say('overlay.address')} className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 font-mono text-small" data-address />
          <button type="button" className="min-h-11 rounded-md bg-primary px-5 text-body font-bold text-primary-foreground disabled:opacity-50" disabled={!config.city} onClick={copy} data-copy>
            {say('overlay.copy')}
          </button>
        </div>
        <p className="min-h-6 text-small leading-[17px] text-muted-foreground" role="status" aria-live="polite" data-status>{status}</p>
        <div className="mt-2" data-obs-steps>
          <p className="text-body font-bold leading-[18px]">{say('overlay.steps.title')}</p>
          <ol className="mt-1 list-decimal pl-5 text-body leading-[21px]">
            {[1, 2, 3, 4].map((n) => <li key={n}>{say(`overlay.steps.${n}`, { w: size.width, h: size.height })}</li>)}
          </ol>
        </div>
        <p className="mt-4 text-small leading-[17px] text-muted-foreground">{say('overlay.static')}</p>
      </div>
    </div>
  )
}
