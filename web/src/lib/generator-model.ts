/**
 * What the card generator (#25) needs besides the picture, PURE: the address of the page for a choice (so a pick survives a
 * reload and can be linked: the share dialog links here with the city already chosen), the reading of such an address, the file
 * name and the labels of the choices.
 */
import { MEASURES, type Measure } from './sentences/stat'
import { STAT_SIZE_IDS, type StatSize } from './stat-card'

export interface GeneratorChoice {
  /** `rj/cidade-exemplo`, or undefined while no city is chosen. */
  city?: { uf: string; slug: string }
  measure: Measure
  size: StatSize
}

export const DEFAULT_CHOICE: Pick<GeneratorChoice, 'measure' | 'size'> = { measure: 'nonVoters', size: 'square' }

export const MEASURE_LABELS: Record<Measure, string> = { nonVoters: 'Quem não votou', margin: 'Margem em votos', turnout: 'Comparecimento' }
export const SIZE_LABELS: Record<StatSize, string> = { square: 'Quadrado', story: 'Story', preview: 'Prévia de link' }
export const DOWNLOAD_LABELS: Record<StatSize, string> = { square: 'Baixar imagem quadrada', story: 'Baixar imagem Story', preview: 'Baixar imagem de prévia' }

export const QUERY_MEASURE: Record<Measure, string> = { nonVoters: 'nao-votou', margin: 'margem', turnout: 'comparecimento' }
const CITY = /^([a-z]{2})\/([a-z0-9-]+)$/

/** `?cidade=rj/cidade-exemplo&medida=margem&tamanho=story`; the defaults are left out. */
export function choiceQuery(c: GeneratorChoice): string {
  const q = new URLSearchParams()
  if (c.city) q.set('cidade', `${c.city.uf}/${c.city.slug}`)
  if (c.measure !== DEFAULT_CHOICE.measure) q.set('medida', QUERY_MEASURE[c.measure])
  if (c.size !== DEFAULT_CHOICE.size) q.set('tamanho', c.size)
  const s = q.toString().replace(/%2F/g, '/')
  return s ? `?${s}` : ''
}

/** The choice an address asks for; anything unknown falls back to the default, never throws. */
export function parseChoice(search: string): GeneratorChoice {
  const q = new URLSearchParams(search)
  const m = CITY.exec(q.get('cidade') ?? '')
  const measure = MEASURES.find((x) => QUERY_MEASURE[x] === q.get('medida')) ?? DEFAULT_CHOICE.measure
  const size = STAT_SIZE_IDS.find((x) => x === q.get('tamanho')) ?? DEFAULT_CHOICE.size
  return { city: m ? { uf: m[1]!, slug: m[2]! } : undefined, measure, size }
}

/** `voto-a-voto-rj-cidade-exemplo-nao-votou-2026-turno-1-quadrado.png` (ASCII: slugs are). */
export function statFilename(c: { uf: string; slug: string }, measure: Measure, view: { ano: number; turno: number }, size: StatSize, ext: 'png' | 'svg' = 'png'): string {
  return `voto-a-voto-${c.uf}-${c.slug}-${QUERY_MEASURE[measure]}-${view.ano}-turno-${view.turno}-${size === 'square' ? 'quadrado' : size === 'preview' ? 'previa' : 'story'}.${ext}`
}
