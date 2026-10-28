/**
 * The municipality-map island of `/mapa/<uf>/` (ticket #16 = Rio de Janeiro; #17 reuses it per state).
 * The pattern is `StateMapMap` (ticket #11), applied to one state's municipalities:
 *
 * - The pre-rendered markup is always the LIST view: one plain link per municipality (name, signed
 *   margin, colour chip), ordered by round-2 valid votes, plus legend and the notes. Everything
 *   works without JavaScript. A tap on a row simply follows its link to the City card (#83): the
 *   list is where the state page's search filters (see `scripts/state-search.ts`), not a selector.
 * - Hydrated, the "Mapa" view fetches the state's committed mesh file (`geoUrl`, a GET to the
 *   site's own origin, only when a visitor asks for the map), joins every shape to the dataset by
 *   the 7-digit IBGE code, and draws an SVG choropleth with pan and zoom; a tap SELECTS the
 *   municipality (panel below; "Abrir cidade" opens its city page) -- without JavaScript the list
 *   rows stay plain links to the same city pages.
 * - Colour never carries the meaning alone: the signed pp is on every list row, on the map shapes
 *   that are large enough at the current zoom, in the selected panel, and the aria-label of every
 *   interactive element states the same figures. Municipalities without a round-2 pairing and mesh
 *   shapes the dataset does not list stay without fill and are counted in the legend's notes.
 *
 * Analytics (ticket #20 surface, noop today): `map_view {view}` when the view changes,
 * `map_municipio_tap {cd}` when a hydrated tap selects a municipality.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import { formatInt } from '@/shared/city-model'
import { displayName } from '@/shared/city-search'
import { getAnalytics } from '@/analytics'
import { formatSwing } from '@/lib/margins'
import type { CityMarginRow } from '@/lib/margins-city'
import type { CityMapData } from '@/lib/city-map-data'
import { BIN_COLOR, marginBin, marginLegend, fgOf, type DivBin } from '@/lib/scale'
import { meshShapes, parseMunicipalityMesh, type MunicipalityMesh } from '@/lib/municipality-geo'

export interface CityMapProps {
  data: CityMapData
  /** Site base as `withBase` wants it (page passes `normalizeBase(import.meta.env.BASE_URL)`). */
  base: string
  /** URL of the committed mesh file of this state (public/geo/municipios-<uf>.json). */
  geoUrl: string
  /** Display name of the state ("Rio de Janeiro"): the page's own text, not election data. */
  ufNome: string
  /**
   * Dataset municipalities the committed mesh does not carry (ticket #17: e.g. Boa Esperança do
   * Norte, created after the IBGE mesh): the page counts them at build time from the mesh file, so
   * the note is already on the pre-rendered LIST view; once the map view has the mesh, the count
   * is recomputed from the joined shapes.
   */
  semContorno: number
}

type Vista = 'lista' | 'mapa'

/** A zoomed/panned viewBox: a window inside the map's full projected box. */
interface Window_ {
  x: number
  y: number
  w: number
  h: number
}

const fmt = formatSwing
const fmtInt = formatInt

/** One zoom step and the deepest zoom the visitor can reach. */
const ZOOM_STEP = 1.6
const ZOOM_IN_MAX = 12
/** The rendered width of the svg (px); the viewBox scales it. */
export const RENDER_WIDTH = 350
/** The labels are step 1 (13 px) AS DRAWN, at every zoom: their size in viewBox units is 13 / pxUnit (#87). A shape shows its value
 * once the row text is >= this wide on screen (the panel covers the rest). */
const LABEL_PX = 13
const VALUE_PX = 40
const NAME_PX = 64
/** Label box estimate (screen px per character): bold 13 px digits, and 13 px regular name text;
 * deliberately a little over so the real text never reaches where the estimate allowed none. */
const VALUE_CHAR = 8
const NAME_CHAR = 7
/** Which inline labels a shape draws at the current zoom (after the placement pass). */
export interface ShapeLabels {
  value: boolean
  nome: boolean
}

/** Estimated box of an inline label around its baseline (label text sits upright in the SVG). */
interface LabelRect {
  x0: number
  y0: number
  x1: number
  y1: number
}

const rectOf = (cx: number, baselineY: number, w: number, above: number, below: number): LabelRect => ({
  x0: cx - w / 2,
  x1: cx + w / 2,
  y0: baselineY - above,
  y1: baselineY + below,
})

const hits = (a: LabelRect, b: LabelRect): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

const within = (r: LabelRect, w: Window_): boolean => r.x0 >= w.x && r.y0 >= w.y && r.x1 <= w.x + w.w && r.y1 <= w.y + w.h

/**
 * The collision pass of the map labels (review of the #16 captures): at fit-all several shapes of
 * the same cluster would print their numbers through each other, and names would clip at the
 * container's edge. Greedy placement admits a label only if its estimated box stays inside the
 * VIEWPORT at the CURRENT zoom and free of every already-placed box; bigger shapes (and then the
 * bigger margins) claim their labels first, and every shape's value is tried before its name. The
 * full text stays in the row's aria-label and tooltip either way.
 */
export function placeLabels(shapes: ReturnType<typeof meshShapes>, byIbge: Map<string, CityMarginRow>, win: Window_): Map<string, ShapeLabels> {
  const pxUnit = RENDER_WIDTH / win.w
  const out = new Map<string, ShapeLabels>()
  type Cand = { kind: keyof ShapeLabels; codarea: string; prio: number; sec: number; rect: LabelRect }
  const candidates: Cand[] = []
  for (const shape of shapes) {
    const row = byIbge.get(shape.codarea)
    if (!row || row.margin2 === null) continue
    const bb = bboxOf(shape)
    out.set(shape.codarea, { value: false, nome: false })
    // A value only prints where it was already legible at this zoom (same gates as before)...
    if (bb.w * pxUnit >= VALUE_PX && bb.h * pxUnit >= 18)
      candidates.push({ kind: 'value', codarea: shape.codarea, prio: bb.w * bb.h, sec: Math.abs(row.margin2), rect: rectOf(shape.cx, shape.cy - 2 / pxUnit, (fmt(row.margin2).length * VALUE_CHAR) / pxUnit, 12 / pxUnit, 4 / pxUnit) })
    // ...and a name only where it fits without clipping mid-word or crossing the container edge.
    if (bb.w * pxUnit >= NAME_PX && bb.h * pxUnit >= 34)
      candidates.push({ kind: 'nome', codarea: shape.codarea, prio: bb.w * bb.h, sec: Math.abs(row.margin2), rect: rectOf(shape.cx, shape.cy + 16 / pxUnit, (displayName(row.nome).length * NAME_CHAR) / pxUnit, 12 / pxUnit, 4 / pxUnit) })
  }
  const placed: LabelRect[] = []
  const admit = (kind: keyof ShapeLabels) => {
    candidates
      .filter((c) => c.kind === kind)
      .sort((a, b) => b.prio - a.prio || b.sec - a.sec || a.codarea.localeCompare(b.codarea))
      .forEach((cand) => {
        if (!within(cand.rect, win)) return
        if (placed.some((p) => hits(p, cand.rect))) return
        placed.push(cand.rect)
        out.get(cand.codarea)![kind] = true
      })
  }
  admit('value')
  admit('nome')
  return out
}

/** Pointer movement (px) under which a drag is still a tap. */
const TAP_PX = 6

export default function CityMapMap({ data, base, geoUrl, ufNome, semContorno }: CityMapProps): ReactElement {
  const { rows, ladoANome, ladoBNome, ladoANomeCompleto, ladoBNomeCompleto, ano, uf } = data
  const analytics = getAnalytics()

  // The pre-rendered markup is always the list (the server cannot know the URL); hydration honours
  // ?vista=mapa right after mount (no SSR mismatch) and keeps it in the URL below.
  const [vista, setVista] = useState<Vista>('lista')
  const [mesh, setMesh] = useState<MunicipalityMesh | null>(null)
  const [meshError, setMeshError] = useState(false)
  /** Selected municipality of the panel; default = the one with most round-2 valid votes. */
  const defaultCd = useMemo(
    () => [...rows].sort((a, b) => b.validos2 - a.validos2 || a.cdMunicipio.localeCompare(b.cdMunicipio))[0]?.cdMunicipio ?? '',
    [rows],
  )
  const [selected, setSelected] = useState(defaultCd)
  const sectionRef = useRef<HTMLElement | null>(null)

  const withBase_ = (path: string) => base.replace(/\/$/, '') + path
  const cityHref = (slug: string) => withBase_(`/${uf}/${slug}/`)
  const byCd = useMemo(() => new Map(rows.map((r) => [r.cdMunicipio, r])), [rows])
  const byIbge = useMemo(() => new Map(rows.map((r) => [r.cdIbge, r])), [rows])

  const tapCd = (cd: string) => {
    if (cd !== selected) setSelected(cd)
    analytics.event('map_municipio_tap', { cd })
  }
  const setVista_ = (v: Vista) => {
    if (v !== vista) analytics.event('map_view', { view: v })
    setVista(v)
    const url = new URL(window.location.href)
    if (v === 'mapa') url.searchParams.set('vista', 'mapa')
    else url.searchParams.delete('vista')
    window.history.replaceState(null, '', url)
  }

  // The state page's search box sits above the island (outside React). Typing there while the map is
  // showing brings the list back: the filter only exists on the list, so the visitor sees the result of the typing.
  useEffect(() => {
    if (vista !== 'mapa') return
    const input = document.querySelector('[data-state-search] input')
    const back = () => setVista_('lista')
    input?.addEventListener('input', back)
    return () => input?.removeEventListener('input', back)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista])

  // The mesh loads only when a visitor opens the map view (and once; an error keeps the list and shows a note).
  useEffect(() => {
    if (vista !== 'mapa' || mesh || meshError) return
    const controller = new AbortController()
    fetch(geoUrl, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`malha: HTTP ${r.status}`)
        return r.json()
      })
      .then((json) => setMesh(parseMunicipalityMesh(json)))
      .catch(() => setMeshError(true))
    return () => controller.abort()
  }, [vista, mesh, meshError, geoUrl])

  // Honour a pre-hydration tap (data-pending-cd on the island host, written by the page script) and
  // the ?vista=mapa deep link: the never-lost-tap model of the state map, at city granularity.
  useEffect(() => {
    const host = sectionRef.current?.closest('astro-island') as HTMLElement | null
    const pending = host?.dataset.pendingCd
    const pendingVista = host?.dataset.pendingVista
    delete host?.dataset.pendingCd
    delete host?.dataset.pendingVista
    const deepLink = new URLSearchParams(window.location.search).get('vista') === 'mapa'
    if (pendingVista === 'mapa' && !deepLink) {
      const url = new URL(window.location.href)
      url.searchParams.set('vista', 'mapa')
      window.history.replaceState(null, '', url)
    }
    if (deepLink || pendingVista === 'mapa') setVista('mapa')
    if (pending) setSelected(pending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section ref={sectionRef} data-slot="city-map" data-uf={uf} aria-label={`Mapa por município: margem de ${ladoANome} sobre ${ladoBNome} em ${ufNome}`}>
      {/* Lista | Mapa: a lista é a vista padrão (e a única sem JavaScript). */}
      <div className="ml-auto flex w-fit gap-1 rounded-md bg-secondary p-1" role="group" aria-label="Lista ou mapa">
        {(['lista', 'mapa'] as const).map((v) => (
          <a
            key={v}
            aria-current={vista === v ? 'true' : undefined}
            className={'grid min-h-11 place-items-center rounded-md px-3 text-step-1' + (vista === v ? ' bg-primary font-bold text-primary-foreground' : ' cursor-pointer text-muted-foreground')}
            href={v === 'mapa' ? '?vista=mapa' : '?'}
            onClick={(e) => {
              e.preventDefault()
              setVista_(v)
            }}
          >
            {v === 'lista' ? 'Lista' : 'Mapa'}
          </a>
        ))}
      </div>

      {vista === 'lista' ? <Lista rows={rows} base={base} uf={uf} ladoANome={ladoANome} ladoBNome={ladoBNome} /> : null}

      {vista === 'mapa' ? (
        <MapView mesh={mesh} meshError={meshError} byIbge={byIbge} tapCd={tapCd} cityHref={cityHref} selected={selected} ladoANome={ladoANome} ladoBNome={ladoBNome} ufNome={ufNome} />
      ) : null}

      <Escala vista={vista} rows={rows} shapes={vista === 'mapa' && mesh ? meshShapes(mesh) : null} semContorno={semContorno} ladoANome={ladoANome} ladoBNome={ladoBNome} />
      {/* The panel belongs to the map: there a tap selects. In the list a tap opens the City card, so no selection to show. */}
      {vista === 'mapa' ? <Selecionado row={byCd.get(selected) ?? null} cityHref={cityHref} ladoANome={ladoANome} ladoBNome={ladoBNome} ladoACompleto={ladoANomeCompleto} ladoBCompleto={ladoBNomeCompleto} ano={ano} /> : null}
    </section>
  )
}

/** Why a colour: the same figure as plain text (aria-label, and colour is not the only cue). */
export function valueText(row: CityMarginRow, ladoANome: string, ladoBNome: string): string {
  if (row.margin2 === null) return 'sem dados do 2º turno'
  return `${fmt(row.margin2)} pp, ${row.margin2 < 0 ? ladoBNome : ladoANome} à frente`
}

function binOf(row: CityMarginRow | undefined): DivBin | null {
  if (!row || row.margin2 === null) return null
  return marginBin(row.margin2)
}

/**
 * The pre-rendered (and no-JS) view, and the ONE list of the state page: one row per municipality, colour chip + name + signed pp
 * + valid votes. Every row is a plain link to the City card (no click handler: hydrated or not, a tap navigates). The state
 * page's search filters these very rows by toggling `hidden` on them (React never sets that attribute, so hydration and re-renders
 * leave it alone); a fresh mount of the list (back from the map view) announces itself so the filter is applied before paint.
 */
function Lista({ rows, base, uf, ladoANome, ladoBNome }: { rows: CityMarginRow[]; base: string; uf: string; ladoANome: string; ladoBNome: string }): ReactElement {
  const sorted = useMemo(() => [...rows].sort((a, b) => b.validos2 - a.validos2 || a.nome.localeCompare(b.nome, 'pt')), [rows])
  useLayoutEffect(() => {
    document.dispatchEvent(new Event('city-list:mounted'))
  }, [])
  if (rows.length === 0) return <p className="mt-2 text-step-2">Nenhum município deste estado no dataset.</p>
  const baseTrunk = base.replace(/\/$/, '')
  return (
    <nav className="mt-2" aria-label="Municípios">
      {sorted.map((row) => {
        const bin = binOf(row)
        return (
          <a
            key={row.cdMunicipio}
            className="flex min-h-11 items-center gap-2 border-t border-border px-1 text-left text-foreground [content-visibility:auto] [contain-intrinsic-size:auto_45px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            data-cd={row.cdMunicipio}
            data-cd-ibge={row.cdIbge}
            href={`${baseTrunk}/${uf}/${row.slug}/`}
          >
            <span aria-hidden="true" className="w-4 shrink-0 self-center rounded-sm border border-border" style={{ background: bin ? BIN_COLOR[bin] : 'var(--muted)', height: 18 }} />
            <span className="min-w-0 flex-1 text-step-2 wrap-anywhere">{displayName(row.nome)}</span>
            {/* The row's name is its own text (label in name): the figures are visible, and the words that say who is ahead are read, not seen. */}
            <span className="text-step-1">
              {row.margin2 === null ? 'sem dados' : `${fmt(row.margin2)} pp`}
              <span className="sr-only">{row.margin2 === null ? ' do 2º turno' : `, ${row.margin2 < 0 ? ladoBNome : ladoANome} à frente`}</span>
            </span>
            <span className="text-step-1 text-muted-foreground">
              {fmtInt(row.validos2)}
              <span className="sr-only"> votos válidos</span>
            </span>
          </a>
        )
      })}
    </nav>
  )
}

/** The SVG view, drawn from the fetched mesh: pan, zoom, colours by the scale, tap = select. */
function MapView({
  mesh,
  meshError,
  byIbge,
  tapCd,
  cityHref,
  selected,
  ladoANome,
  ladoBNome,
  ufNome,
}: {
  mesh: MunicipalityMesh | null
  meshError: boolean
  byIbge: Map<string, CityMarginRow>
  tapCd: (cd: string) => void
  cityHref: (slug: string) => string
  selected: string
  ladoANome: string
  ladoBNome: string
  ufNome: string
}): ReactElement {
  const W = mesh?.largura ?? 1
  const H = mesh?.altura ?? 1
  const [view, setView] = useState<Window_ | null>(null)
  const dragRef = useRef<{ x0: number; y0: number; vx0: number; vy0: number; moved: boolean } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const full: Window_ = { x: 0, y: 0, w: W, h: H }
  const current = view ?? full
  /** CSS px per viewBox unit at this zoom. */
  const unit = RENDER_WIDTH / current.w

  const zoomed = view !== null && (view.w < full.w || view.h < full.h)
  const zoomTo = (factor: number) => {
    const vc = current
    const w = Math.min(full.w, Math.max(full.w / ZOOM_IN_MAX, vc.w / factor))
    const scale = w / vc.w
    const h = Math.min(full.h, vc.h * scale)
    const cx = vc.x + vc.w / 2
    const cy = vc.y + vc.h / 2
    setView({ x: Math.max(0, Math.min(full.w - w, cx - w / 2)), y: Math.max(0, Math.min(full.h - h, cy - h / 2)), w, h })
  }
  const shift = (dxPx: number, dyPx: number) => {
    setView((v) => {
      const vc = v ?? full
      return {
        x: Math.max(0, Math.min(full.w - vc.w, vc.x + dxPx)),
        y: Math.max(0, Math.min(full.h - vc.h, vc.y + dyPx)),
        w: vc.w,
        h: vc.h,
      }
    })
  }

  // Keyboard pan/zoom on the map itself (the buttons stay for pointer users).
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      zoomTo(ZOOM_STEP)
      return
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      zoomTo(1 / ZOOM_STEP)
      return
    }
    const step = current.w / 6
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowDown: [0, -step],
      ArrowUp: [0, step],
    }
    const move = moves[e.key]
    if (move) {
      e.preventDefault()
      shift(move[0]!, move[1]!)
    }
  }

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragRef.current = { x0: e.clientX, y0: e.clientY, vx0: current.x, vy0: current.y, moved: false }
    // jsdom (and old engines) has no pointer capture; pan still works through the move events.
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    const svg = svgRef.current
    if (!drag || !svg) return
    const dx = e.clientX - drag.x0!
    const dy = e.clientY - drag.y0!
    if (Math.hypot(dx, dy) > TAP_PX) drag.moved = true
    if (!drag.moved) return
    // The viewBox window follows the drag, in viewBox units, always inside the full map.
    setView({
      x: Math.max(0, Math.min(full.w - current.w, drag.vx0! - (dx * current.w) / svg.clientWidth)),
      y: Math.max(0, Math.min(full.h - current.h, drag.vy0! - (dy * current.h) / svg.clientHeight)),
      w: current.w,
      h: current.h,
    })
  }
  const onPointerUp = () => {
    // A tap's click still fires after pointerup: keep the moved flag for the shape's onClick.
    const drag = dragRef.current
    if (drag && !drag.moved) dragRef.current = null
  }
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const moved = dragRef.current?.moved ?? false
    dragRef.current = null
    if (moved) return // it was a pan drag, not a tap
    tapCd(e.currentTarget.dataset.cd!)
  }

  if (meshError) {
    return <p className="mt-2 text-step-2">O arquivo da malha do estado não carregou. A lista acima continua funcionando.</p>
  }
  if (!mesh) {
    return (
      <p className="mt-2 text-step-2" aria-busy="true">
        Carregando a malha dos municípios…
      </p>
    )
  }
  const shapes = meshShapes(mesh)
  const matched = shapes.filter((s) => byIbge.has(s.codarea))
  const unmatched = shapes.length - matched.length
  // The labels fit the CURRENT window: the collision pass re-runs on every pan/zoom.
  const labels = placeLabels(shapes, byIbge, current)

  return (
    <div className="mt-2" data-slot="mapa-municipios">
      <svg
        ref={svgRef}
        className="mx-auto block touch-none select-none rounded-md bg-secondary"
        tabIndex={0}
        style={{ width: RENDER_WIDTH, maxHeight: 430 }}
        viewBox={`${current.x} ${current.y} ${current.w} ${current.h}`}
        aria-label={`Mapa dos municípios de ${ufNome}, cada um pintado pela margem do 2º turno; arraste para deslocar, use Aproximar e Afastar para o zoom.`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* First pass: every shape (fill + border + the selection outline), in file order. */}
        {shapes.map((shape) => {
          const row = byIbge.get(shape.codarea)
          const bin = binOf(row)
          const isSel = !!row && selected === row.cdMunicipio
          const label = row
            ? `${displayName(row.nome)}: ${valueText(row, ladoANome, ladoBNome)}; ${fmtInt(row.validos2)} votos válidos`
            : `Código IBGE ${shape.codarea}: município da malha sem dados neste dataset`
          return (
            <a key={shape.codarea} className="cursor-pointer" data-cd={row?.cdMunicipio} data-cd-ibge={shape.codarea} href={row ? cityHref(row.slug) : undefined} onClick={row ? click : (e) => e.preventDefault()} aria-label={label}>
              <title>{label}</title>
              <path
                d={toPath(shape.pts)}
                fill={bin ? BIN_COLOR[bin] : 'var(--muted)'}
                stroke="var(--background)"
                strokeWidth={Math.max(0.4, current.w / full.w)}
              />
              {isSel && <path d={toPath(shape.pts)} fill="none" stroke="var(--foreground)" strokeWidth={2.5} pointerEvents="none" />}
            </a>
          )
        })}
        {/* Second pass: every admitted label ABOVE every fill, so a neighbour never overprints a
            value or a name (the collision pass already keeps the labels off each other). */}
        {shapes.map((shape) => {
          const lab = labels.get(shape.codarea)
          if (!lab || (!lab.value && !lab.nome)) return null
          const row = byIbge.get(shape.codarea)
          const bin = binOf(row)
          const ink = bin ? fgOf(bin) : 'var(--foreground)'
          return (
            <g key={shape.codarea} data-cd-ibge={shape.codarea} pointerEvents="none">
              {lab.value && (
                <text fill={ink} fontSize={LABEL_PX / unit} fontWeight={700} textAnchor="middle" x={shape.cx} y={shape.cy - 2 / unit}>
                  {fmt(row!.margin2!)}
                </text>
              )}
              {lab.nome && <text fill={ink} fontSize={LABEL_PX / unit} textAnchor="middle" x={shape.cx} y={shape.cy + 16 / unit}>{displayName(row!.nome)}</text>}
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex items-center gap-1" role="group" aria-label="Zoom e pan do mapa">
        <button type="button" className="min-h-11 min-w-11 flex-1 rounded-md border border-border bg-background text-step-2 font-bold" onClick={() => zoomTo(ZOOM_STEP)}>
          + Aproximar
        </button>
        <button type="button" className="min-h-11 min-w-11 flex-1 rounded-md border border-border bg-background text-step-2 font-bold" onClick={() => zoomTo(1 / ZOOM_STEP)}>
          − Afastar
        </button>
        {zoomed && (
          <button type="button" className="min-h-11 min-w-11 flex-1 rounded-md border border-border bg-background text-step-2 font-bold" onClick={() => setView(null)}>
            Ver tudo
          </button>
        )}
      </div>
      {unmatched > 0 && (
        <p className="mt-1 text-step-1 text-muted-foreground" data-slot="malha-sem-dados">
          {unmatched} dos municípios do arquivo de fronteiras não têm dados neste dataset e ficam em cinza.
        </p>
      )}
    </div>
  )
}

/** Legend: the same margin scale and numeric edges as ticket #11, plus the without-fill counts. */
function Escala({ vista, rows, shapes, semContorno, ladoANome, ladoBNome }: { vista: Vista; rows: CityMarginRow[]; shapes: { codarea: string }[] | null; semContorno: number; ladoANome: string; ladoBNome: string }): ReactElement {
  const semDados = rows.filter((r) => r.margin2 === null)
  // Dataset municipalities the committed mesh does not carry (ticket #17: e.g. a municipality the
  // IBGE created after the mesh's year): the row stays in the list; the map simply has no shape.
  // With the mesh loaded the map view recomputes it; before that the build-time count of the page.
  const withoutShape = shapes ? rows.filter((r) => r.cdIbge !== '' && !shapes.some((s) => s.codarea === r.cdIbge)) : []
  const semContornoCount = shapes ? withoutShape.length : semContorno
  const legend = marginLegend()
  return (
    <figure className="mt-2 border-t border-border pt-2" data-slot="mapa-escala">
      <figcaption className="text-step-1">
        Margem (pp) = % de {ladoANome} menos % de {ladoBNome} nos municípios. Negativo é {ladoBNome} à frente; positivo é {ladoANome} à frente.
      </figcaption>
      <div aria-hidden="true" className="mt-1.5 flex h-4 overflow-hidden rounded-sm">
        {legend.bins.map((bin) => (
          <div key={bin} className="min-w-0 flex-1" style={{ background: BIN_COLOR[bin] }} />
        ))}
      </div>
      <div aria-hidden="true" className="flex justify-between text-step-1 text-muted-foreground">
        {legend.edges.map((edge) => (
          <span key={edge}>{edge}</span>
        ))}
      </div>
      <span className="sr-only">Escala, da esquerda para a direita: {legend.edges.join(', ')} pp.</span>
      {semDados.length > 0 && (
        <p className="mt-1 text-step-1 text-muted-foreground" data-slot="escala-sem-dados">
          Sem cor: {semDados.length} {semDados.length === 1 ? 'município sem' : 'municípios sem'} dados do 2º turno.
        </p>
      )}
      {semContornoCount > 0 && (
        <p className="mt-1 text-step-1 text-muted-foreground" data-slot="escala-sem-contorno">
          Sem contorno: {semContornoCount} {semContornoCount === 1 ? 'município não tem' : 'municípios não têm'} fronteira no arquivo do IBGE (o município é mais novo que a malha) e só aparece na lista.
        </p>
      )}
      <p className="mt-1 text-step-1 text-muted-foreground">
        {vista === 'mapa' ? 'Toque num município para ver os totais; a lista também repete os valores.' : 'Toque numa cidade da lista para abrir a carta dela; o mapa mostra os mesmos valores.'}
      </p>
      {shapes && <span className="sr-only">{shapes.length} municípios no arquivo de fronteiras.</span>}
    </figure>
  )
}

/** The selected municipality (frame 5's big value), shown with the map view, where a tap selects. */
function Selecionado({
  row,
  cityHref,
  ladoANome,
  ladoBNome,
  ladoACompleto,
  ladoBCompleto,
  ano,
}: {
  row: CityMarginRow | null
  cityHref: (slug: string) => string
  ladoANome: string
  ladoBNome: string
  ladoACompleto: string
  ladoBCompleto: string
  ano: number
}): ReactElement | null {
  if (!row) return null
  return (
    <div className="mt-2 border-t border-border pt-2" data-slot="mapa-selecionado">
      <div className="flex items-baseline justify-between gap-3">
        {/* The big figure never wraps: number and unit stay together even under a two-line title. */}
        <p aria-live="polite" className="min-w-0 font-serif text-step-2 font-bold wrap-anywhere">
          {displayName(row.nome)} · {row.margin2 === null ? 'sem dados' : 'selecionado'}
        </p>
        <p className="shrink-0 whitespace-nowrap font-serif text-step-4 font-bold" aria-hidden="true">
          {row.margin2 === null ? '—' : `${fmt(row.margin2)} pp`}
        </p>
      </div>
      <p className="text-step-2">Votos válidos (2º turno): {fmtInt(row.validos2)}</p>
      {row.margin2 === null ? (
        <p className="mt-1 text-step-2">Sem par do 2º turno de {ano} neste dataset: o município fica sem cor no mapa.</p>
      ) : row.margin1 === null ? (
        <p className="mt-1 text-step-2">Margem ({ladoACompleto} − {ladoBCompleto}): {fmt(row.margin2!)} pp. (Sem dados do 1º turno neste dataset.)</p>
      ) : (
        <p className="mt-1 text-step-2">
          Margem ({ladoACompleto} − {ladoBCompleto}): {fmt(row.margin2!)} pp. Na eleição anterior: {fmt(row.margin1)} pp. Variação: {fmt(row.swing!)} pp.
        </p>
      )}
      <a className="mt-2 flex min-h-11 items-center justify-center rounded-md bg-primary text-step-2 font-bold text-primary-foreground" data-abrir-cidade="1" href={cityHref(row.slug)}>
        Abrir cidade
      </a>
    </div>
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

/** Projected bbox of a shape (px of the viewBox), for the inline label size decision. */
function bboxOf(shape: { pts: [number, number][] }): { w: number; h: number } {
  const xs = shape.pts.map((p) => p[0])
  const ys = shape.pts.map((p) => p[1])
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}