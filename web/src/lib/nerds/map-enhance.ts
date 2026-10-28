import { STEP_FGS, STEP_FILLS } from './mapa'

/**
 * The map island (#78): the static SVG is already in the page (every state a link, abbreviation and value printed); this adds, from 1024 px and once in view, the pickers of the
 * panel (measure, turno), recolours the SVG for the choice and for the cycle in the address, and reads out the state under the pointer or the keyboard focus. The choice is
 * kept in the address (`medida=`, `turno=`). `data-drawn` on the panel is the key of the view on screen, which tests wait on; recolouring is synchronous, so there is no
 * stale result to guard against.
 */
export interface ViewData {
  legend: string[]
  /** uf -> [printed value, step 0-4] */
  cells: Record<string, [string, number]>
  /** region -> printed value (Brasil only) */
  chips?: Record<string, string>
}
export interface MapEnhanceOptions {
  views: Record<string, ViewData>
  options: { id: string; label: string; group?: string }[]
  cycles: number[]
  initial: { ano: number; turno: number; measure: string }
  names: Record<string, string>
  search: string
}

export interface MapEnhanced {
  destroy(): void
}

export function enhanceMap(panel: HTMLElement, o: MapEnhanceOptions): MapEnhanced {
  const doc = panel.ownerDocument
  const params = new URLSearchParams(o.search)
  const wantedAno = Number(params.get('ciclo'))
  let ano = o.cycles.includes(wantedAno) ? wantedAno : o.initial.ano
  let turno = params.get('turno') === '2' ? 2 : params.get('turno') === '1' ? 1 : o.initial.turno
  const wantedMeasure = params.get('medida')
  let measure = o.options.some((x) => x.id === wantedMeasure) ? wantedMeasure! : o.initial.measure

  const controls = doc.createElement('div')
  controls.className = 'nerds-map-controls'
  controls.innerHTML =
    [...new Set(o.options.map((x) => x.group ?? 'Medida'))].map((g) => `<div class="nerds-picker" role="group" aria-label="${g}" data-picker-measure>${o.options.filter((x) => (x.group ?? 'Medida') === g).map((x) => `<button type="button" data-measure-option="${x.id}">${x.label}</button>`).join('')}</div>`).join('') +
    `<div class="nerds-picker" role="group" aria-label="Turno" data-picker-turno><button type="button" data-turno-option="1">1º turno</button><button type="button" data-turno-option="2">2º turno</button></div>`
  const head = panel.querySelector('.nerds-panel__head')!
  head.after(controls)
  const readout = doc.createElement('p')
  readout.className = 'nerds-readout'
  readout.setAttribute('role', 'status')
  readout.setAttribute('aria-live', 'polite')
  readout.dataset.readout = ''
  panel.querySelector('[data-uf-map]')!.after(readout)

  const svg = panel.querySelector<SVGElement>('[data-uf-map]')!
  const legend = panel.querySelector<HTMLElement>('[data-legend]')
  const chips = panel.querySelector<HTMLElement>('[data-chips]')

  function draw() {
    const key = `${ano}-${turno}-${measure}`
    const view = o.views[key]
    for (const el of svg.querySelectorAll<SVGElement>('[data-map-uf]')) {
      const uf = el.getAttribute('data-map-uf')!
      const cell = view?.cells[uf]
      const path = el.querySelector<SVGPathElement>('path')!
      const rect = el.querySelector<SVGRectElement>('rect')
      const texts = [...el.querySelectorAll<SVGTextElement>('text')]
      if (cell) {
        const [text, step] = cell
        path.style.fill = STEP_FILLS[step]!
        if (rect) rect.style.fill = STEP_FILLS[step]!
        el.setAttribute('aria-label', `${uf.toUpperCase()} · ${o.names[uf] ?? uf}: ${text}, faixa ${view!.legend[step]}`)
        if (rect) texts[0]!.textContent = `${uf.toUpperCase()} ${text}`
        else {
          texts[0]!.style.fill = STEP_FGS[step]!
          if (texts[1]) {
            texts[1].textContent = text
            texts[1].style.fill = STEP_FGS[step]!
          }
        }
      }
    }
    legend?.querySelectorAll<HTMLElement>('[data-step]').forEach((li, i) => (li.querySelector('.nerds-legend5__label')!.textContent = view?.legend[i] ?? ''))
    chips?.querySelectorAll<HTMLElement>('[data-chip]').forEach((li) => {
      const value = view?.chips?.[li.dataset.chip!]
      if (value) li.querySelector('[data-chip-value]')!.textContent = value
    })
    controls.querySelectorAll<HTMLElement>('[data-measure-option]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.measureOption === measure)))
    controls.querySelectorAll<HTMLElement>('[data-turno-option]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.turnoOption) === turno)))
    const label = o.options.find((x) => x.id === measure)?.label ?? measure
    panel.querySelector<HTMLElement>('[data-map-caption]')!.textContent = `${label}, ${turno}º turno de ${ano}`
    panel.dataset.drawn = key
  }

  function remember() {
    const q = new URLSearchParams(location.search)
    q.set('medida', measure)
    q.set('turno', String(turno))
    try {
      history.replaceState(null, '', `?${q.toString()}`)
    } catch {
      /* the address stays as it is */
    }
  }

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement
    const m = t.closest<HTMLElement>('[data-measure-option]')
    const u = t.closest<HTMLElement>('[data-turno-option]')
    if (m) measure = m.dataset.measureOption!
    else if (u) turno = Number(u.dataset.turnoOption)
    else return
    draw()
    remember()
  }
  const say = (e: Event) => {
    const a = (e.target as Element).closest?.('[data-map-uf]')
    if (a) readout.textContent = a.getAttribute('aria-label') ?? ''
  }
  controls.addEventListener('click', onClick)
  svg.addEventListener('mouseover', say)
  svg.addEventListener('focusin', say)
  draw()

  return {
    destroy() {
      controls.removeEventListener('click', onClick)
      svg.removeEventListener('mouseover', say)
      svg.removeEventListener('focusin', say)
      controls.remove()
      readout.remove()
      delete panel.dataset.drawn
    },
  }
}
