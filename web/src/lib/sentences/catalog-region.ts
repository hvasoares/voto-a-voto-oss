/**
 * The words of the region page (#183), kept out of `catalog.ts` like `catalog-brasil.ts`: only the region page's modules import this file, and importing it
 * registers the sentences in `CATALOG`. Same rules as the catalog: data, templates with `{name}` slots, both registers, reviewed like code.
 *
 * Wording rule of this page: it counts states, municipalities and votes, never people's reasons. The two candidates are named in ballot-number order with
 * the same words; nothing is ranked and nobody "wins". The links say where they go.
 */
import { registerSentences, type Key } from './catalog'

export const REGION_KEYS = [
  'region.title',
  'region.counts',
  'region.states.one',
  'region.states.other',
  'region.cities.one',
  'region.cities.other',
  'region.list',
  'region.row.ahead',
  'region.nerds',
  'region.more',
  'region.compare',
  'region.description',
] as const satisfies readonly Key[]

export const REGION_STANDARD: Record<(typeof REGION_KEYS)[number], string> = {
  'region.title': 'Região {name}',
  'region.counts': '{states} · {cities}',
  'region.states.one': '{n} estado',
  'region.states.other': '{n} estados',
  'region.cities.one': '{n} município',
  'region.cities.other': '{n} municípios',
  'region.list': 'Estados da região {name}',
  'region.row.ahead': ', {name} à frente',
  'region.nerds': 'Dados da região ›',
  'region.more': 'Mais sobre a região {name}',
  'region.compare': 'Comparar regiões ›',
  'region.description': 'Resultado do 2º turno de {ano} na região {name}: votos válidos por candidato e os estados da região.',
}

export const REGION_PLAIN: Record<(typeof REGION_KEYS)[number], string> = {
  'region.title': 'Região {name}',
  'region.counts': '{states} · {cities}',
  'region.states.one': '{n} estado',
  'region.states.other': '{n} estados',
  'region.cities.one': '{n} município',
  'region.cities.other': '{n} municípios',
  'region.list': 'Estados da região {name}',
  'region.row.ahead': ', {name} à frente',
  'region.nerds': 'Dados da região ›',
  'region.more': 'Mais sobre a região {name}',
  'region.compare': 'Comparar regiões ›',
  'region.description': 'Como foi o 2º turno de {ano} na região {name}: os votos de cada candidato e os estados da região.',
}

registerSentences('pt-BR', 'standard', REGION_STANDARD)
registerSentences('pt-BR', 'plain', REGION_PLAIN)
