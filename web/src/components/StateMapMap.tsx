/**
 * The state-map island for /mapa/ (margin of the runoff round) and /mapa/virada/ (the swing
 * between rounds). Both routes share this component; the pages pre-render it, so the mosaic, the
 * legend, the selected-state panel and the table are plain HTML before hydration and keep working
 * without JavaScript: taps then follow the links (each tile and table row links the state page)
 * and the tabs are real links between the two routes.
 *
 * Hydrated, a tap on a tile, shape or callout only selects the state (panel below); the
 * Mosaico|Mapa toggle becomes an in-page switch (`?vista=mapa` stays in the URL, so a plain link
 * deep-links the map view too). A tap recorded while still static (page script writes
 * data-pending-uf on the island root) is honoured right after hydration - the tap never gets lost.
 *
 * Analytics (ticket #20 surface, noop today): `map_view {view}` when a tab or Mosaico/Mapa is
 * chosen, `map_state_tap {uf}` when a hydrated tap selects a state.
 */
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { formatInt } from '@/shared/city-model'
import { UF_TILES } from '@/slots/home/uf-grid'
import { getAnalytics } from '@/analytics'
import { formatSwing } from '@/lib/margins'
import { panelLines } from '@/lib/state-map-panel'
import { ufFullLabel, UF_NAMES } from '@/lib/uf-names'
import type { StateMapData, StateMapRow } from '@/lib/state-map-data'
import { BIN_COLOR, fgOf, marginBin, marginLegend, swingBin, swingLegend, tileEdge, type DivBin } from '@/lib/scale'
import { CALLOUT_LEFT, CALLOUT_RIGHT, UF_SHAPES } from '@/lib/uf-polygons'

export type MapKind = 'margin' | 'swing'
export type MapPresentation = 'mosaico' | 'mapa'

export interface StateMapProps {
  kind: MapKind
  data: StateMapData
  /** Site base as `withBase` wants it (page passes `normalizeBase(import.meta.env.BASE_URL)`). */
  base: string
}

/** SVG coordinate space: the projected map plus two callout boxes drawn in the same space. */
const VB_WIDTH = 486
const CALL_X = 392
const CALL_W = 88
const CALL_H = 48
const CALL_PITCH = 55
const CALL_TOP = 6
const VB_HEIGHT = CALL_TOP + 9 * CALL_PITCH + CALL_H

const valueOf = (row: StateMapRow, kind: MapKind): number => (kind === 'margin' ? row.margin2 : row.swing)

const rowOf = (rows: readonly StateMapRow[], uf: string): StateMapRow | undefined => rows.find((r) => r.uf === uf)

const binOf = (rows: readonly StateMapRow[], uf: string, kind: MapKind): DivBin => {
  const row = rowOf(rows, uf)
  if (!row) return 'zero'
  return kind === 'margin' ? marginBin(row.margin2) : swingBin(row.swing)
}

/** Why a colour: plain text for the tile names (screen readers, and colour is not the only cue). */
const valueText = (rows: readonly StateMapRow[], uf: string, kind: MapKind, ladoANome: string, ladoBNome: string): string => {
  const row = rowOf(rows, uf)
  if (!row) return ''
  const ahead = valueOf(row, kind) < 0 ? ladoBNome : ladoANome
  return kind === 'margin' ? `${ahead} à frente` : `variação para ${ahead}`
}

/**
 * Extra name of a tile/shape/callout anchor, read after the visible bits. The anchor label comes
 * from its CONTENT (visible bits + this sr-only sentence, issue #19): axe's
 * label-content-name-mismatch fails an `aria-label` that replaces content text ("MT +0,2") with a
 * full label that does not contain it, and the content-based name keeps the full value in both.
 */
const nameDetail = (rows: readonly StateMapRow[], uf: string, kind: MapKind, ladoANome: string, ladoBNome: string): string => {
  const row = rowOf(rows, uf)
  if (!row) return ''
  const name = UF_NAMES[uf.toLowerCase()] ?? uf.toUpperCase()
  return `${name}: ${fmt(valueOf(row, kind))} pp, ${valueText(rows, uf, kind, ladoANome, ladoBNome)}; ${fmtInt(row.validos2)} votos válidos`
}


const fmt = formatSwing
const fmtInt = formatInt

export default function StateMapMap({ kind, data, base }: StateMapProps) {
  const { rows, ladoANome, ladoBNome } = data
  const analytics = getAnalytics()

  // The pre-rendered markup is always the mosaic (the server cannot know the URL); hydration
  // honours ?vista=mapa right after mount (no SSR mismatch) and keeps it in the URL below.
  const [vista, setVista] = useState<MapPresentation>('mosaico')
  /** Selected state of the panel; default = the state with most valid votes (the frames pick SP). */
  const defaultUf = useMemo(() => [...rows].sort((a, b) => b.validos2 - a.validos2)[0]?.uf ?? '', [rows])
  const [selected, setSelected] = useState(defaultUf)
  const sectionRef = useRef<HTMLElement | null>(null)

  const withBase = (path: string) => base.replace(/\/$/, '') + path
  const stateHref = (uf: string) => withBase(`/${uf}/`)
  const tapState = (uf: string) => {
    if (uf !== selected) setSelected(uf)
    analytics.event('map_state_tap', { uf })
  }
  const stop = (uf: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    tapState(uf)
  }

  // Honour a pre-hydration tap (data-pending-uf recorded by the page script on the island host)
  // and the ?vista=mapa deep link.
  useEffect(() => {
    const host = sectionRef.current?.closest('astro-island') as HTMLElement | null
    const pending = host?.dataset.pendingUf
    delete host?.dataset.pendingUf
    const deepLink = new URLSearchParams(window.location.search).get('vista') === 'mapa'
    if (deepLink) setVista('mapa')
    if (pending) tapState(pending)
  }, [])

  const byUf = useMemo(() => new Map(rows.map((r) => [r.uf, r])), [rows])
  const validos2Max = Math.max(...rows.map((r) => r.validos2), 0)
  const legend: { bins: DivBin[]; edges: string[]; negativeNote?: string | null } = kind === 'margin' ? marginLegend() : swingLegend(rows.map((r) => r.swing))
  const tileClass =
    'flex select-none flex-col items-center justify-center rounded-md border border-border text-center' +
    ' focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary'

  // Table default: most valid votes first (the frames list states by turnout).
  const sorted = useMemo(() => [...rows].sort((a, b) => b.validos2 - a.validos2), [rows])

  return (
    <section ref={sectionRef} data-slot="state-map" data-kind={kind} aria-label={kind === 'margin' ? 'Mapa por estado: margem' : 'Mapa por estado: virada'}>
      {/* Abas: margem (2º turno) | virada (1º→2º) — frames 10/10b; plain links between the routes. */}
      <nav className="flex gap-1 rounded-md bg-secondary p-1" aria-label="Margem ou virada">
        <a
          aria-current={kind === 'margin' ? 'page' : undefined}
          className={'flex min-h-11 flex-1 items-center justify-center rounded-md text-[14px]' + (kind === 'margin' ? ' bg-primary font-bold text-primary-foreground' : ' cursor-pointer text-muted-foreground')}
          href={withBase('/mapa/')}
          onClick={() => {
            if (kind !== 'margin') analytics.event('map_view', { view: 'margin' })
          }}
        >
          Margem (2º turno)
        </a>
        <a
          aria-current={kind === 'swing' ? 'page' : undefined}
          className={'flex min-h-11 flex-1 items-center justify-center rounded-md text-[14px]' + (kind === 'swing' ? ' bg-primary font-bold text-primary-foreground' : ' cursor-pointer text-muted-foreground')}
          href={withBase('/mapa/virada/')}
          onClick={() => {
            if (kind !== 'swing') analytics.event('map_view', { view: 'swing' })
          }}
        >
          Virada (1º→2º)
        </a>
      </nav>

      {/* Mosaico | Mapa: mosaico é a vista padrão (e a única sem JavaScript). */}
      <div className="ml-auto mt-2 flex w-fit gap-1 rounded-md bg-secondary p-1" role="group" aria-label="Mosaico ou mapa">
        {(['mosaico', 'mapa'] as const).map((v) => (
          <a
            key={v}
            aria-current={vista === v ? 'true' : undefined}
            className={'grid min-h-11 min-w-16 place-items-center rounded-md px-3 text-[13px]' + (vista === v ? ' bg-primary font-bold text-primary-foreground' : ' cursor-pointer text-muted-foreground')}
            href={v === 'mapa' ? '?vista=mapa' : '?'}
            onClick={(e) => {
              e.preventDefault()
              if (vista !== v) {
                analytics.event('map_view', { view: v })
                setVista(v)
                const url = new URL(window.location.href)
                if (v === 'mapa') url.searchParams.set('vista', 'mapa')
                else url.searchParams.delete('vista')
                window.history.replaceState(null, '', url)
              }
            }}
          >
            {v === 'mosaico' ? 'Mosaico' : 'Mapa'}
          </a>
        ))}
      </div>

      {vista === 'mosaico' ? (
        <nav className="mx-auto mt-1 grid w-fit justify-center gap-px [grid-auto-rows:48px] [grid-template-columns:repeat(7,48px)]" aria-label="Estados">
          {UF_TILES.filter((t) => byUf.has(t.uf)).map((tile) => {
            const uf = tile.uf
            const row = byUf.get(uf)!
            const bin = binOf(rows, uf, kind)
            return (
              <a
                key={uf}
                className={tileClass + (selected === uf ? ' border-[2px] border-foreground' : '')}
                data-uf={uf}
                href={stateHref(uf)}
                onClick={stop(uf)}
                style={{
                  gridColumn: tile.col,
                  gridRow: tile.row,
                  width: tileEdge(row.validos2, validos2Max),
                  height: tileEdge(row.validos2, validos2Max),
                  background: BIN_COLOR[bin],
                  color: fgOf(bin),
                }}
              >
                <span className="text-[14px] font-bold leading-[15px]">{uf.toUpperCase()}</span>
                <span className="text-[11px] leading-[12px]">{fmt(valueOf(row, kind))}</span>
                <span className="sr-only">{nameDetail(rows, uf, kind, ladoANome, ladoBNome)}</span>
              </a>
            )
          })}
        </nav>
      ) : (
        <MapView kind={kind} rows={rows} selected={selected} ladoANome={ladoANome} ladoBNome={ladoBNome} tapState={tapState} stateHref={stateHref} />
      )}

      {/* Escala numérica (as bordas dos degraus; nunca só a cor carrega o sentido). */}
      <figure className="mt-2 border-t border-border pt-2" data-slot="mapa-escala">
        <figcaption className="text-small leading-[14px]">
          {kind === 'margin'
            ? `Margem (pp) = % de ${ladoANome} menos % de ${ladoBNome}. Negativo é ${ladoBNome} à frente; positivo é ${ladoANome} à frente.`
            : `Variação da margem entre os turnos (pp). Positivo: a margem se moveu para ${ladoANome}; negativo: para ${ladoBNome}.`}
        </figcaption>
        <div aria-hidden="true" className="mt-1.5 flex h-4 overflow-hidden rounded-sm">
          {legend.bins.map((bin) => (
            <div key={bin} className="min-w-0 flex-1" style={{ background: BIN_COLOR[bin] }} />
          ))}
        </div>
        <div aria-hidden="true" className="flex justify-between text-[10px] leading-[12px] text-muted-foreground">
          {legend.edges.map((edge) => (
            <span key={edge}>{edge}</span>
          ))}
        </div>
        <span className="sr-only">Escala, da esquerda para a direita: {legend.edges.join(', ')} pp.</span>
        {legend.negativeNote && <p className="text-small leading-[14px] text-muted-foreground">{legend.negativeNote}</p>}
        <p className="mt-1 text-small leading-[14px] text-muted-foreground">Tamanho = votos válidos. Toque num estado para ver os totais.</p>
      </figure>

      {/* Estado selecionado (frames: valor grande, votos válidos e as duas margens). */}
      <div className="mt-2 border-t border-border pt-2" data-slot="mapa-selecionado">
        <div className="flex items-baseline justify-between gap-3">
          <p aria-live="polite" className="font-serif text-body font-bold">
            {selected.toUpperCase()} · selecionado
            <span className="sr-only">{` · ${UF_NAMES[selected.toLowerCase()] ?? selected.toUpperCase()}`}</span>
          </p>
          <p className="font-serif text-[28px] font-bold leading-[30px]" aria-hidden="true">
            {fmt((rowOf(rows, selected) && valueOf(rowOf(rows, selected)!, kind)) || 0)} pp
          </p>
        </div>
        <SelectedDetails kind={kind} data={data} uf={selected} />
        <a className="mt-2 flex min-h-11 items-center justify-center rounded-md bg-primary text-body font-bold text-primary-foreground" data-abrir-estado="1" href={stateHref(selected)}>
          Abrir estado
        </a>
      </div>

      {/* Alternativa sem cor dos frames: tabela; cada linha continua abrindo o estado. */}
      <details className="mt-3 border-t border-border pt-2" data-slot="mapa-tabela">
        <summary className="cursor-pointer text-body font-bold">Tabela por estado</summary>
        <table className="mt-1 w-full text-[13px] leading-[17px]">
          <thead>
            <tr>
              <th scope="col" className="text-left">Estado</th>
              <th scope="col" className="text-right">Votos válidos (2º turno)</th>
              <th scope="col" className="text-right">{kind === 'margin' ? 'Margem (pp)' : 'Variação (pp)'}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.uf} className="border-t border-border">
                <td className="py-1 text-left">
                  <a href={stateHref(row.uf)} className={selected === row.uf ? 'font-bold' : ''} aria-label={`${ufFullLabel(row.uf)}: ${fmt(valueOf(row, kind))} pp`}>
                    {row.uf.toUpperCase()}
                  </a>
                </td>
                <td className="py-1 text-right">{fmtInt(row.validos2)}</td>
                <td className="py-1 text-right">{fmt(valueOf(row, kind))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

/** Sentences of the selected-state panel, frame 10 (margin) vs frame 10b (swing). */
function SelectedDetails({ kind, data, uf }: { kind: MapKind; data: StateMapData; uf: string }) {
  const row = data.rows.find((r) => r.uf === uf)
  if (!row) return null
  const [first, second] = panelLines(kind, data, row)
  return (
    <>
      <p className="text-body leading-[18px]">{first}</p>
      <p className="mt-1 text-body leading-[18px]">{second}</p>
    </>
  )
}

/** The SVG view: shapes coloured by the scale, small/narrow states in callout boxes. */
function MapView(props: {
  kind: MapKind
  rows: readonly StateMapRow[]
  selected: string
  ladoANome: string
  ladoBNome: string
  tapState: (uf: string) => void
  stateHref: (uf: string) => string
}) {
  const { kind, rows, selected, ladoANome, ladoBNome, tapState, stateHref } = props

  // Right column, in the frame order; left column only 'ac'. Boxes spread from the top, and a line
  // links each box to its shape's centroid (leader lines, like the frames). Callouts a dataset
  // does not cover (fixture sets are three-state) simply do not appear.
  const callouts: { uf: string; y: number; left: boolean }[] = []
  let lastY = CALL_TOP - CALL_PITCH
  for (const uf of CALLOUT_RIGHT) {
    if (!rows.some((r) => r.uf === uf)) continue
    const y = lastY + CALL_PITCH
    lastY = y
    callouts.push({ uf, y, left: false })
  }
  for (const uf of CALLOUT_LEFT) {
    if (!rows.some((r) => r.uf === uf)) continue
    const shape = UF_SHAPES.find((s) => s.uf === uf)
    callouts.push({ uf, y: shape ? Math.round(shape.cy - CALL_H / 2) : CALL_TOP, left: true })
  }

  return (
    <svg
      className="mx-auto mt-1 block"
      role="img"
      style={{ width: 350, maxHeight: 420 }}
      viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
      aria-label={`Mapa do Brasil por estado, ${kind === 'margin' ? `margem de ${ladoANome} sobre ${ladoBNome} no 2º turno` : `variação da margem de ${ladoANome} sobre ${ladoBNome} entre os turnos`}: cada estado está pintado pela escala e os valores menores aparecem nas caixas ao lado.`}
    >
      {UF_SHAPES.map((shape) => {
        const row: StateMapRow | undefined = rows.find((r) => r.uf === shape.uf)
        if (!row) return null
        const bin = binOf(rows, shape.uf, kind)
        const isCallout = CALLOUT_RIGHT.includes(shape.uf) || CALLOUT_LEFT.includes(shape.uf)
        const isSel = selected === shape.uf
        const big = Math.max(shape.w, shape.h) > 55
        return (
          <a
            key={shape.uf}
            className="cursor-pointer"
            aria-label={`${ufFullLabel(shape.uf)}: ${fmt(valueOf(row, kind))} pp, ${valueText(rows, shape.uf, kind, ladoANome, ladoBNome)}; ${fmtInt(row.validos2)} votos válidos`}
            data-uf={shape.uf}
            href={stateHref(shape.uf)}
            onClick={(e) => {
              e.preventDefault()
              tapState(shape.uf)
            }}
          >
            <path d={toPath(shape.pts)} fill={BIN_COLOR[bin]} stroke="var(--background)" strokeWidth={2} />
            {isSel && <path d={toPath(shape.pts)} fill="none" stroke="var(--foreground)" strokeWidth={2.5} pointerEvents="none" />}
            {big && !isCallout && (
              <text fill={fgOf(bin)} fontSize={12} fontWeight={700} textAnchor="middle" x={shape.cx} y={shape.cy - 2} pointerEvents="none">
                {shape.uf.toUpperCase()}
              </text>
            )}
            {big && !isCallout && (
              <text fill={fgOf(bin)} fontSize={10} textAnchor="middle" x={shape.cx} y={shape.cy + 9} pointerEvents="none">
                {fmt(valueOf(row, kind))}
              </text>
            )}
          </a>
        )
      })}
      {callouts.map(({ uf, y, left }) => {
        const shape = UF_SHAPES.find((s) => s.uf === uf)
        const row = rows.find((r) => r.uf === uf)
        if (!shape || !row) return null
        const x = left ? 4 : CALL_X
        return (
          <g key={uf}>
            <line stroke="var(--border)" strokeWidth={1} x1={left ? shape.cx + 6 : shape.cx} y1={shape.cy} x2={left ? x + CALL_W : x} y2={y + CALL_H / 2} />
            <a
              className="cursor-pointer"
              aria-label={`${ufFullLabel(uf)}: ${fmt(valueOf(row, kind))} pp, ${valueText(rows, uf, kind, ladoANome, ladoBNome)}; ${fmtInt(row.validos2)} votos válidos`}
              data-uf={uf}
              href={stateHref(uf)}
              onClick={(e) => {
                e.preventDefault()
                tapState(uf)
              }}
            >
              <rect fill="var(--background)" height={CALL_H} rx={4} stroke={selected === uf ? 'var(--foreground)' : 'var(--border)'} strokeWidth={selected === uf ? 2 : 1} width={CALL_W} x={x} y={y} />
              <rect fill={BIN_COLOR[binOf(rows, uf, kind)]} height={16} stroke="var(--border)" strokeWidth={0.5} width={16} x={x + 6} y={y + 16} />
              <text dominantBaseline="middle" fill="var(--foreground)" fontSize={13} fontWeight={700} x={x + 27} y={y + CALL_H / 2}>
                {uf.toUpperCase()} {fmt(valueOf(row, kind))}
              </text>
            </a>
          </g>
        )
      })}
    </svg>
  )
}

function toPath(pts: readonly (readonly [number, number])[]): string {
  let d = 'M'
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) d += 'L'
    d += `${pts[i]![0]} ${pts[i]![1]}`
  }
  return d + 'Z'
}