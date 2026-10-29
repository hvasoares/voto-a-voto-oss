import { useEffect, useMemo, useRef, useState } from 'react'
import { getAnalytics } from '@/analytics'
import PlacePicker, { type PickedPlace } from '@/components/PlacePicker'
import ShareActions from '@/components/ShareActions'
import { useCityShards } from '@/components/use-city-shards'
import { useIslandReady } from '@/components/use-island-ready'
import { withBase } from '@/paths'
import { duelContent } from '@/lib/duel-content'
import {
  LEVELS,
  buildMeasures,
  cityPlace,
  duelQuery,
  parseDuelAddress,
  regionPlace,
  statePlace,
  switchLevel,
  type DuelAddress,
  type DuelData,
  type DuelPlace,
  type Level,
  type Measure,
} from '@/lib/duel-model'
import { duelSay, measureLabel } from '@/lib/sentences/duel'
import { readRegister } from '@/lib/sentences/register-store'
import type { MessageKey } from '@/lib/sentences/catalog'

/**
 * Cara a cara (#30): two cities, two states or two regions side by side, with a mark on the higher value of each measure. The level and
 * the two places live in the ADDRESS (`?nivel=estado&a=sp&b=mg`), so reloading or forwarding the link reproduces the card; nothing is
 * stored on the device. A city is read from its own shard; the states and regions come with the page (props). The card is drawn by
 * `duelCardSvg` for the share flow, and its text alternative is the generated sentence. "Modo duelo" (`&modo=duelo`) is the same card
 * without the page's chrome, in large type, for a stream or a projector; Esc leaves it.
 * The reply flow (#39): `&resposta=1` opens with the sender's city in A and the search of B in focus.
 */
export interface DuelProps {
  base: string
  origin: string
  fixture: boolean
  /** The date the seal prints ("27/10"). */
  editionDate: string
  data: DuelData
}

const say = (key: MessageKey, params: Record<string, string | number> = {}) => duelSay({}, key, params)

type Resolved = { status: 'empty' | 'loading' | 'failed' | 'unknown' } | { status: 'ok'; place: DuelPlace }

/** A figure with its mark: the higher value is in the accent colour, underlined, and says so to a screen reader. */
function Value({ text, high }: { text: string; high: boolean }) {
  const none = text === '—'
  return (
    <span className="duel-value" data-value data-higher={high ? 'yes' : undefined} data-none={none ? 'yes' : undefined}>
      {text}
      {high && <span className="sr-only"> ({say('duel.mark')})</span>}
      {none && <span className="sr-only">{say('duel.noValue')}</span>}
    </span>
  )
}

/** The rows of the card: on a phone each measure is one panel (its name over the two values), from 1024 px the frame's three columns (A, the name, B). */
function Rows({ measures, data }: { measures: readonly Measure[]; data: DuelData }) {
  return (
    <div className="duel-rows" data-rows>
      {measures.map((m) => (
        <div key={m.key} className="duel-row" data-measure={m.key}>
          <p className="duel-label">{measureLabel({}, m.key, data)}</p>
          {(['a', 'b'] as const).map((side) => (
            <p key={side} className="duel-cell" data-side={side}>
              <Value text={m[side].text} high={m.higher === side} />
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}

/** A state or a region: the same field as the city's (label inside, bold value), with the browser's own list. */
function OptionField({ label, value, options, placeholder, onChange }: { label: string; value: string; options: { code: string; name: string }[]; placeholder: string; onChange: (code: string) => void }) {
  return (
    <label className="duel-select" data-option-field>
      <span>{label}</span>
      <select aria-label={label} value={value} data-empty={value ? undefined : ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
      </select>
    </label>
  )
}

/** The chrome-free, large-type view of the same card (modo duelo): the numbers of the page, the seal always on screen, Esc leaves. */
function DuelMode({ measures, a, b, data, level, seal, onExit }: { measures: readonly Measure[]; a: DuelPlace; b: DuelPlace; data: DuelData; level: Level; seal: string; onExit: () => void }) {
  const exit = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    exit.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onExit()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])
  return (
    <div className="duel-mode" role="dialog" aria-modal="true" aria-label={say('duel.mode.title')} data-duel-mode>
      <div className="duel-mode__head">
        <div>
          <h2 className="duel-mode__title">{say('duel.title')}</h2>
          <p className="duel-mode__sub">{say(`duel.sub.${level}` as MessageKey, { ano: data.ano })}</p>
        </div>
        <button ref={exit} type="button" className="duel-mode__exit" onClick={onExit}>{say('duel.mode.exit')}</button>
      </div>
      <div className="duel-mode__places">
        {[a, b].map((p, i) => (
          <div key={p.code} className="duel-mode__place" data-duel-place={i === 0 ? 'a' : 'b'}>
            <p className="duel-mode__kind">{say('duel.slot', { kind: say(`duel.kind.${level}` as MessageKey), letter: i === 0 ? 'A' : 'B' })}</p>
            <p className="duel-mode__name">{p.label}</p>
          </div>
        ))}
      </div>
      <div className="duel-mode__rows" data-rows>
        {measures.flatMap((m) =>
          (['a', 'b'] as const).map((side) => (
            <div key={`${m.key}-${side}`} className="duel-mode__cell" data-measure={m.key} data-side={side}>
              <p className="duel-mode__label">{measureLabel({}, m.key, data)}</p>
              <p className="duel-mode__number"><Value text={m[side].text} high={m.higher === side} /></p>
            </div>
          )),
        )}
      </div>
      <p className="duel-mode__seal" data-seal>{seal}</p>
      <p className="duel-mode__legend">{say('duel.mode.note')}</p>
    </div>
  )
}

export default function Duel({ base, origin, fixture, editionDate, data }: DuelProps) {
  const [address, setAddress] = useState<DuelAddress>({ level: 'cidade' })
  const [notes, setNotes] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const replyStarted = useRef(false)
  const opener = useRef<HTMLButtonElement>(null)
  const shards = useCityShards(base, address.level === 'cidade' ? [address.a, address.b].filter((c): c is string => !!c) : [])

  useEffect(() => {
    const parsed = parseDuelAddress(location.search)
    setAddress(parsed.address)
    setNotes(parsed.problems.map((p) => (p.kind === 'overseas' ? say('duel.overseas') : say('duel.unknown'))))
  }, [])

  const commit = (next: DuelAddress) => {
    setAddress(next)
    history.replaceState(null, '', `${location.pathname}${duelQuery(next)}`)
  }

  const resolve = (code?: string): Resolved => {
    if (!code) return { status: 'empty' }
    if (address.level === 'cidade') {
      const s = shards[code]
      return !s || s === 'loading' ? { status: 'loading' } : s === 'failed' ? { status: 'failed' } : { status: 'ok', place: cityPlace(s, data) }
    }
    if (address.level === 'estado') {
      const row = data.states.find((r) => r.uf === code)
      return row ? { status: 'ok', place: statePlace(row) } : { status: 'unknown' }
    }
    const row = data.regions.find((r) => r.regiao === code)
    return row ? { status: 'ok', place: regionPlace(row) } : { status: 'unknown' }
  }
  const ra = resolve(address.a)
  const rb = resolve(address.b)
  const [pa, pb] = [ra, rb].map((r) => (r.status === 'ok' ? r.place : undefined))

  // A state or a region the data does not have: the field is emptied (and the address with it).
  useEffect(() => {
    const clean = { ...address }
    if (ra.status === 'unknown') delete clean.a
    if (rb.status === 'unknown') delete clean.b
    if (clean.a !== address.a || clean.b !== address.b) {
      setNotes((n) => [...n, say('duel.unknown')])
      commit(clean)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ra.status, rb.status])

  const same = !!pa && !!pb && pa.code === pb.code
  const missing = [pa, pb].filter((p): p is DuelPlace => !!p?.missingCycle)
  const ready = !!pa && !!pb && !same && missing.length === 0
  // data-ready (#122): yes once the pair answered, and it stays yes while the visitor re-picks (the
  // contract's never-revert); a side whose shard failed keeps its inline message, the island stays usable.
  const island = useIslandReady('duel')
  useEffect(() => {
    if (ready) island.markReady()
  }, [ready, island.markReady])
  const content = useMemo(() => (ready ? duelContent(address.level, pa!, pb!, data, { origin, base, fixture }) : undefined), [ready, address.level, pa, pb, data, origin, base, fixture])
  const register = typeof window === 'undefined' ? 'standard' : readRegister()
  const reply = !!address.reply && !!address.a && !address.b
  const level = address.level

  // The reply flow opens counted once, when the sender's city is there, and puts the visitor in the search of the second.
  useEffect(() => {
    if (!reply || replyStarted.current || !pa) return
    replyStarted.current = true
    getAnalytics().event('duel_reply_started')
    document.querySelector<HTMLInputElement>('[data-duel-field="b"] input')?.focus()
  }, [reply, pa])

  const pick = (side: 'a' | 'b', code: string | undefined) => {
    const next: DuelAddress = { ...address, [side]: code || undefined }
    if (!code) delete next[side]
    delete next.mode
    const finishing = !!address.reply && side === 'b' && !!code && !!next.a
    if (finishing) {
      delete next.reply
      setDone(true)
    }
    commit(next)
    setNotes([])
    if (code && next.a && next.b && next.a !== next.b) {
      getAnalytics().event('duel_pair_chosen', { level: next.level })
      if (finishing) getAnalytics().event('duel_reply_completed')
    }
  }

  const changeLevel = (to: Level) => {
    if (to === level) return
    commit(switchLevel(to))
    setDone(false)
    setNotes(address.a || address.b ? [say('duel.reset')] : [])
  }

  const setMode = (on: boolean) => {
    const next: DuelAddress = { ...address }
    if (on) next.mode = 'duelo'
    else delete next.mode
    commit(next)
    if (on) getAnalytics().event('duel_mode_opened', { level })
    else opener.current?.focus()
  }

  const messages = [
    ...notes,
    ...(ra.status === 'failed' || rb.status === 'failed' ? [say('duel.failed')] : []),
    ...(same ? [say('duel.same', { place: pa!.label })] : []),
    ...missing.map((p) => say('duel.noCycle', { place: p.label, ano: data.ano })),
    ...(ready ? [pa, pb].filter((p) => p?.missingPrev).map((p) => say('duel.noSwing', { place: p!.label, prev: data.prev })) : []),
    ...(done && ready ? [say('duel.reply.done')] : []),
  ]
  const pickedOf = (code: string | undefined, p: DuelPlace | undefined): PickedPlace | undefined => {
    if (!code) return undefined
    const [uf = '', slug = ''] = code.split('/')
    return { uf, slug, nome: p?.name ?? slug }
  }
  const kind = say(`duel.kind.${level}` as MessageKey)
  const field = (side: 'a' | 'b', place: DuelPlace | undefined) => {
    const label = say('duel.slot', { kind, letter: side === 'a' ? 'A' : 'B' })
    const code = address[side]
    const placeholder = reply && side === 'b' ? say('duel.placeholder.reply') : say(`duel.placeholder.${level}` as MessageKey)
    return (
      <div data-duel-field={side}>
        {level === 'cidade' ? (
          <PlacePicker base={base} inside label={label} value={pickedOf(code, place)} onPick={(p) => pick(side, `${p.uf}/${p.slug}`)} placeholder={placeholder} />
        ) : (
          <OptionField
            label={label}
            value={code ?? ''}
            placeholder={placeholder}
            options={(level === 'estado' ? data.states.map((s) => ({ code: s.uf, name: statePlace(s).label })) : data.regions.map((r) => ({ code: r.regiao, name: regionPlace(r).name }))).sort((x, y) => x.name.localeCompare(y.name, 'pt'))}
            onChange={(c) => pick(side, c)}
          />
        )}
      </div>
    )
  }
  const sub = reply && pa ? say('duel.sub.reply', { place: pa.name }) : say(`duel.sub.${level}` as MessageKey, { ano: data.ano })
  const replyHref = pa && level === 'cidade' ? `${withBase(base, '/cara-a-cara/')}${duelQuery({ level: 'cidade', a: pa.code, reply: true })}` : undefined

  return (
    <div data-duel data-level={level} data-ready={island.dataReady} data-error={island.dataError} data-places={[address.a, address.b].filter(Boolean).length}>
      <div className="duel-head">
        <h1 className="duel-title">{say('duel.title')}</h1>
        <p className="duel-sub" data-sub>{sub}</p>
        {ready && (
          <button ref={opener} type="button" className="duel-open" onClick={() => setMode(true)} data-duel-mode-open>
            {say('duel.mode')} <span aria-hidden="true">⤢</span>
          </button>
        )}
      </div>

      <div className="duel-levels" role="group" aria-label={say('duel.level.label')} data-levels>
        {LEVELS.map((l) => (
          <button key={l} type="button" aria-pressed={l === level} onClick={() => changeLevel(l)}>
            {say(`duel.level.${l}` as MessageKey)}
          </button>
        ))}
      </div>

      <div className="duel-fields" data-fields>
        {field('a', pa)}
        {field('b', pb)}
      </div>

      <div className="duel-messages" aria-live="polite">
        {messages.map((m) => (
          <p key={m} data-message role="status">{m}</p>
        ))}
      </div>

      {content ? (
        <>
          <Rows measures={content.measures} data={data} />
          <div className="duel-actions">
            <ShareActions
              text={content.variants[register].text}
              svg={content.svg}
              filename={content.filename}
              link={content.url}
              primaryLabel={say('duel.share')}
              compact
              onShared={() => getAnalytics().event('duel_shared', { level })}
            />
          </div>
          <button type="button" className="duel-btn duel-btn--outline duel-btn--phone" onClick={() => setMode(true)}>
            {say('duel.mode')} <span aria-hidden="true">⤢</span>
          </button>
          {replyHref && (
            <a className="duel-btn duel-btn--quiet duel-btn--wide" href={replyHref} data-duel-reply>{say('duel.reply')}</a>
          )}
          {content.note && <p className="duel-note" data-virada-note>{content.note}</p>}
        </>
      ) : reply && pa ? (
        <>
          <Rows measures={buildMeasures('cidade', pa)} data={data} />
          <button type="button" className="duel-btn duel-btn--primary duel-btn--wide" data-duel-reply-focus onClick={() => document.querySelector<HTMLInputElement>('[data-duel-field="b"] input')?.focus()}>{say('duel.reply')}</button>
          <p className="duel-note" data-note>{say('duel.reply.note', { place: pa.name })}</p>
        </>
      ) : (
        <p className="duel-note" style={{ textAlign: 'left' }} data-placeholder role="status">{say('duel.choose')}</p>
      )}
      <p className="duel-note" data-note>{say(`duel.note.${level}` as MessageKey)}</p>

      {content && address.mode === 'duelo' && pa && pb && (
        <DuelMode
          measures={content.measures}
          a={pa}
          b={pb}
          data={data}
          level={level}
          seal={say(fixture ? 'duel.seal.fixture' : 'duel.seal', { date: editionDate, address: content.url.replace(/^[a-z]+:\/\//, '') })}
          onExit={() => setMode(false)}
        />
      )}
    </div>
  )
}
