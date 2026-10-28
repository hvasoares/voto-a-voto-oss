/**
 * The only state of a dashboard view is its address (#74): `?ciclo=2022&turno=1&cargo=presidente`. Parsing never throws: an unknown or malformed value falls back to the
 * latest cycle (and the default turno/cargo) and says so in `notes`, which the page prints. Serialising a state gives the canonical query string (fixed key order, defaults
 * omitted never: a permalink always carries all three), so URL -> state -> URL is a round trip.
 */
export const CARGOS = ['presidente'] as const
export type Cargo = (typeof CARGOS)[number]

export interface NerdsState {
  ciclo: number
  turno: 1 | 2
  cargo: Cargo
  /** The panel's measure picker, when the address carries it (Escada, map, Par, Distribuição). */
  medida?: string
}

export interface Parsed {
  state: NerdsState
  /** Visible notes for values that were not recognised. */
  notes: string[]
}

export function defaultState(cycles: readonly number[]): NerdsState {
  return { ciclo: Math.max(...cycles), turno: 1, cargo: 'presidente' }
}

export function parseQuery(search: string, cycles: readonly number[]): Parsed {
  const q = new URLSearchParams(search)
  const state = defaultState(cycles)
  const notes: string[] = []
  const ciclo = q.get('ciclo')
  if (ciclo !== null) {
    if (cycles.includes(Number(ciclo)) && /^\d{4}$/.test(ciclo)) state.ciclo = Number(ciclo)
    else notes.push(`O ciclo “${ciclo.slice(0, 12)}” não existe nos dados; mostrando ${state.ciclo}, o mais recente.`)
  }
  const turno = q.get('turno')
  if (turno !== null) {
    if (turno === '1' || turno === '2') state.turno = Number(turno) as 1 | 2
    else notes.push(`O turno “${turno.slice(0, 12)}” não existe; mostrando o 1º turno.`)
  }
  const cargo = q.get('cargo')
  if (cargo !== null) {
    if ((CARGOS as readonly string[]).includes(cargo)) state.cargo = cargo as Cargo
    else notes.push(`O cargo “${cargo.slice(0, 20)}” não existe nos dados; mostrando Presidente.`)
  }
  const medida = q.get('medida')
  if (medida !== null && /^[a-z0-9_-]{1,40}$/.test(medida)) state.medida = medida
  return { state, notes }
}

export function toQuery(state: NerdsState): string {
  const q = new URLSearchParams({ ciclo: String(state.ciclo), turno: String(state.turno), cargo: state.cargo })
  if (state.medida) q.set('medida', state.medida)
  return `?${q.toString()}`
}
