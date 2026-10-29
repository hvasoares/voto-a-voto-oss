/**
 * "Ficaram em casa" (#32), the phone's island: the share of the electorate that did not vote for anyone, by state, as the tile mosaic (default,
 * and the only view without JavaScript) or the coloured state map, for the cycle and round chosen. It shows no candidate. Every state prints its
 * percentage on the tile, the map shape or its callout; the numeric legend and the table repeat the numbers, so colour is never the only cue.
 *
 * Every sentence and number arrives as the build's `StayHomeModel` (props), so this island does not carry the sentence catalog. It follows the
 * conventions of `StateMapMap` (the page script `scripts/island-pending.ts` keeps a tap that lands before hydration: `data-pending-uf` for a
 * state, `data-pending-vista` for the Mosaico | Mapa toggle), replayed through the shared gate of `useIslandReady` before `data-ready` reports
 * `yes`, URL included.
 */
import { useMemo, useState, type MouseEvent } from 'react'
import { getAnalytics } from '@/analytics'
import { linkHref } from '@/paths'
import { UF_TILES } from '@/slots/home/uf-grid'
import type { StayHomeModel } from '@/lib/stay-home-view'
import { CALLOUT_LEFT, CALLOUT_RIGHT, UF_SHAPES } from '@/lib/uf-polygons'
import { labelUnits } from '@/lib/map-hit'
import { toPath } from '@/lib/map-path'
import { keepVistaInUrl, useMapView } from './use-map-view'
import PlaceText from './PlaceText'

export interface StayHomeMapProps {
  model: StayHomeModel
  /** Site base, as the page reads it with `siteBase()`. */
  base: string
  /** Base-relative page address of each view, by slug (`/mapa/ficaram-em-casa/2022-1/`). */
  viewPaths: Record<string, string>
}

type Presentation = 'mosaico' | 'mapa'

const VB_WIDTH = 486
/** Label size in viewBox units: 13 px (step 1) as drawn at the map's fixed 350 px width. */
const LABEL = labelUnits(VB_WIDTH)
const CALL_X = 392
const CALL_W = 88
const CALL_H = 48
const CALL_PITCH = 55
const CALL_TOP = 6
const VB_HEIGHT = CALL_TOP + 9 * CALL_PITCH + CALL_H

const TAB_ON = ' bg-primary font-bold text-primary-foreground'
const TAB_OFF = ' cursor-pointer text-muted-foreground'

export default function StayHomeMap({ model, base, viewPaths }: StayHomeMapProps) {
  const analytics = getAnalytics()
  const [vista, setVista] = useState<Presentation>('mosaico')
  const { island, sectionRef, selected, tap: tapState } = useMapView({
    name: 'stayhome-map',
    initialSelected: model.defaultUf,
    select: { storage: 'pendingUf', track: (uf) => analytics.event('map_state_tap', { uf }) },
    onVistaTap: keepVistaInUrl,
    openMap: () => setVista('mapa'),
  })
  const hrefOf = (path: string) => linkHref(path, base)
  const stateHref = (uf: string) => hrefOf(`/${uf}/`)
  const stop = (uf: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    tapState(uf)
  }

  const cell = model.cells[selected]
  const tileClass = 'flex select-none flex-col items-center justify-center rounded-md border border-border text-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary'

  return (
    <section ref={sectionRef} data-slot="state-map" data-kind="stayhome" data-ready={island.dataReady} data-error={island.dataError} aria-label="Mapa por estado: ficaram em casa">
      <nav className="flex gap-1 rounded-md bg-secondary p-1" aria-label="Margem, virada ou ficaram em casa">
        {[
          { href: '/mapa/', label: 'Margem', on: false },
          { href: '/mapa/virada/', label: 'Virada', on: false },
          { href: '/mapa/ficaram-em-casa/', label: 'Ficaram em casa', on: true },
        ].map((t) => (
          <a key={t.href} aria-current={t.on ? 'page' : undefined} className={'flex min-h-11 flex-1 items-center justify-center rounded-md px-1 text-center text-step-1' + (t.on ? TAB_ON : TAB_OFF)} href={hrefOf(t.href)}>
            {t.label}
          </a>
        ))}
      </nav>

      <nav className="mt-2 grid grid-cols-6 gap-1 rounded-md bg-secondary p-1" aria-label={model.viewsLabel} data-slot="stayhome-views">
        {model.views.map((v) => (
          <a key={v.slug} aria-current={v.current ? 'page' : undefined} className={'flex min-h-11 flex-col items-center justify-center rounded-md px-0 text-center text-step-1' + (v.current ? TAB_ON : TAB_OFF)} href={hrefOf(viewPaths[v.slug]!)}>
            <span>{v.ano}</span>
            <span className="sr-only"> · </span>
            <span>{v.turno}</span>
          </a>
        ))}
      </nav>

      <div className="ml-auto mt-2 flex w-fit gap-1 rounded-md bg-secondary p-1" role="group" aria-label="Mosaico ou mapa">
        {(['mosaico', 'mapa'] as const).map((v) => (
          <a
            key={v}
            aria-current={vista === v ? 'true' : undefined}
            className={'grid min-h-11 min-w-16 place-items-center rounded-md px-3 text-step-1' + (vista === v ? TAB_ON : TAB_OFF)}
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

      {model.empty && <p className="mt-2 text-step-2" data-nodata>{model.empty}</p>}

      {vista === 'mosaico' ? (
        <nav className="mx-auto mt-1 grid w-fit justify-center gap-px [grid-auto-rows:48px] [grid-template-columns:repeat(7,48px)]" aria-label="Estados">
          {UF_TILES.filter((t) => model.cells[t.uf]).map((tile) => {
            const c = model.cells[tile.uf]!
            return (
              <a
                key={tile.uf}
                className={tileClass + (selected === tile.uf ? ' border-[2px] border-foreground' : '')}
                data-uf={tile.uf}
                href={stateHref(tile.uf)}
                onClick={stop(tile.uf)}
                style={{ gridColumn: tile.col, gridRow: tile.row, width: 48, height: 48, background: c.fill, color: c.fg }}
              >
                <span className="text-step-1 font-bold">{tile.uf.toUpperCase()}</span>
                <span className="text-step-1">{c.text}</span>
                <span className="sr-only">{c.detail}</span>
              </a>
            )
          })}
        </nav>
      ) : (
        <MapView model={model} selected={selected} tapState={tapState} stateHref={stateHref} />
      )}

      <figure className="mt-2 border-t border-border pt-2" data-slot="mapa-escala">
        <figcaption className="text-step-1">{model.legend.caption}</figcaption>
        <div aria-hidden="true" className="mt-1.5 flex h-4 overflow-hidden rounded-sm">
          {model.legend.fills.map((fill, i) => (
            <div key={i} className="min-w-0 flex-1" style={{ background: fill }} />
          ))}
        </div>
        <div aria-hidden="true" className="mx-[7%] flex justify-between text-step-1 text-muted-foreground">
          {model.legend.edges.map((edge) => (
            <span key={edge}>{edge}%</span>
          ))}
        </div>
        <span className="sr-only">{model.legend.scaleSr}</span>
        <p className="mt-1 text-step-1 text-muted-foreground">{vista === 'mapa' ? model.legend.mapNote : model.legend.size}</p>
      </figure>

      {cell && (
        <div className="mt-2 border-t border-border pt-2" data-slot="mapa-selecionado">
          <div className="flex items-baseline justify-between gap-3">
            <p aria-live="polite" className="font-serif text-step-2 font-bold">
              <PlaceText text={cell.selected} />
            </p>
            <p className="font-serif text-step-4 font-bold" aria-hidden="true">{cell.text}</p>
          </div>
          <p className="text-step-2">{cell.lines[0]}</p>
          <p className="mt-1 text-step-1 text-muted-foreground">{cell.lines[1]}</p>
          <a className="mt-2 flex min-h-11 items-center justify-center rounded-md bg-primary text-step-2 font-bold text-primary-foreground" data-abrir-estado="1" href={stateHref(selected)}>
            {model.ui.open}
          </a>
        </div>
      )}

      {model.claim && (
        <div className="mt-2 border-t border-border pt-2" data-slot="stayhome-claim">
          <p className="text-step-2">{model.claim.line}</p>
          <p className="mt-1 text-step-1 text-muted-foreground">{model.claim.limits}</p>
        </div>
      )}

      <Table model={model} selected={selected} stateHref={stateHref} />
    </section>
  )
}

function Table({ model, selected, stateHref }: { model: StayHomeModel; selected: string; stateHref: (uf: string) => string }) {
  const rows = useMemo(() => model.order.map((uf) => model.cells[uf]!), [model])
  return (
    <details className="mt-3 border-t border-border pt-2" data-slot="mapa-tabela">
      <summary className="cursor-pointer text-step-2 font-bold">{model.ui.table}</summary>
      <table className="mt-1 w-full text-step-1">
        <thead>
          <tr>
            <th scope="col" className="text-left">{model.ui.thUf}</th>
            <th scope="col" className="text-right">{model.ui.thAptos}</th>
            <th scope="col" className="text-right">{model.ui.thShare}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.uf} className="border-t border-border">
              <td className="py-1 text-left">
                <a href={stateHref(c.uf)} className={selected === c.uf ? 'font-bold' : ''} aria-label={c.label}>
                  {c.uf.toUpperCase()}
                </a>
              </td>
              <td className="py-1 text-right">{c.aptos}</td>
              <td className="py-1 text-right">{c.share}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

function MapView({ model, selected, tapState, stateHref }: { model: StayHomeModel; selected: string; tapState: (uf: string) => void; stateHref: (uf: string) => string }) {
  const has = (uf: string) => !!model.cells[uf]
  const callouts: { uf: string; y: number; left: boolean }[] = []
  let lastY = CALL_TOP - CALL_PITCH
  for (const uf of CALLOUT_RIGHT) {
    if (!has(uf)) continue
    const y = lastY + CALL_PITCH
    lastY = y
    callouts.push({ uf, y, left: false })
  }
  for (const uf of CALLOUT_LEFT) {
    if (!has(uf)) continue
    const shape = UF_SHAPES.find((s) => s.uf === uf)
    callouts.push({ uf, y: shape ? Math.round(shape.cy - CALL_H / 2) : CALL_TOP, left: true })
  }
  const open = (uf: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    tapState(uf)
  }
  return (
    <svg className="mx-auto mt-1 block" role="img" style={{ width: 350, maxHeight: 420 }} viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`} aria-label={model.alt}>
      {UF_SHAPES.map((shape) => {
        const c = model.cells[shape.uf]
        if (!c) return null
        const isCallout = CALLOUT_RIGHT.includes(shape.uf) || CALLOUT_LEFT.includes(shape.uf)
        // Two stacked 13 px lines (the name and the value) need a shape of about 56 x 44 px on screen; the others are reached through the callouts or a tap.
        const big = shape.w >= 56 && shape.h >= 44
        return (
          <a key={shape.uf} className="cursor-pointer" aria-label={c.label} data-uf={shape.uf} href={stateHref(shape.uf)} onClick={open(shape.uf)}>
            <path d={toPath(shape.pts)} fill={c.fill} stroke="var(--background)" strokeWidth={2} />
            {selected === shape.uf && <path d={toPath(shape.pts)} fill="none" stroke="var(--foreground)" strokeWidth={2.5} pointerEvents="none" />}
            {big && !isCallout && (
              <text fill={c.fg} fontSize={LABEL} fontWeight={700} textAnchor="middle" x={shape.cx} y={shape.cy - 1} pointerEvents="none">
                {shape.uf.toUpperCase()}
              </text>
            )}
            {big && !isCallout && (
              <text fill={c.fg} fontSize={LABEL} textAnchor="middle" x={shape.cx} y={shape.cy + LABEL} pointerEvents="none">
                {c.text}
              </text>
            )}
          </a>
        )
      })}
      {callouts.map(({ uf, y, left }) => {
        const shape = UF_SHAPES.find((s) => s.uf === uf)
        const c = model.cells[uf]
        if (!shape || !c) return null
        const x = left ? 4 : CALL_X
        return (
          <g key={uf}>
            <line stroke="var(--border)" strokeWidth={1} x1={left ? shape.cx + 6 : shape.cx} y1={shape.cy} x2={left ? x + CALL_W : x} y2={y + CALL_H / 2} />
            <a className="cursor-pointer" aria-label={c.label} data-uf={uf} href={stateHref(uf)} onClick={open(uf)}>
              <rect fill="var(--background)" height={CALL_H} rx={4} stroke={selected === uf ? 'var(--foreground)' : 'var(--border)'} strokeWidth={selected === uf ? 2 : 1} width={CALL_W} x={x} y={y} />
              <rect fill={c.fill} height={16} stroke="var(--border)" strokeWidth={0.5} width={16} x={x + 6} y={y + 16} />
              <text dominantBaseline="middle" fill="var(--foreground)" fontSize={LABEL} fontWeight={700} x={x + 27} y={y + CALL_H / 2 - LABEL / 2 - 1}>
                {uf.toUpperCase()}
              </text>
              <text dominantBaseline="middle" fill="var(--foreground)" fontSize={LABEL} x={x + 27} y={y + CALL_H / 2 + LABEL / 2 + 1}>
                {c.text}
              </text>
            </a>
          </g>
        )
      })}
    </svg>
  )
}

