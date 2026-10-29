/**
 * The sentences of the meta description of a city page (what a link preview says), standard register only — a crawler
 * reads no register switch. Kept out of `catalog.ts` like `catalog-duel.ts`: only the link preview's own module
 * (`link-preview.ts`) imports this file, and importing it registers the sentences in `CATALOG`. Same rules as the
 * catalog: data, templates with `{name}` slots, reviewed like code.
 */
import { registerSentences, type Key } from './catalog'

export const PREVIEW_KEYS = [
  'preview.fixture',
  'preview.intro',
  'preview.noResult',
  'preview.noElectorate',
  'preview.noValidVotes',
  'preview.default',
  'preview.pair',
] as const satisfies readonly Key[]

export const PREVIEW_STANDARD: Record<(typeof PREVIEW_KEYS)[number], string> = {
  'preview.fixture': 'Dados fictícios (EXEMPLO). ',
  'preview.intro': 'Resultado de {place}',
  'preview.noResult': '{note}{intro}: o arquivo do TSE não traz votação para os ciclos do site.',
  'preview.noElectorate': '{note}{intro}, {ano}, {turno}º turno: sem eleitores aptos registrados.',
  'preview.noValidVotes': '{note}{intro}, {ano}, {turno}º turno: nenhum voto válido; {notVoted}% do eleitorado não votou.',
  'preview.default': '{note}{intro}, {ano}, {turno}º turno: votaram {voted}% do eleitorado e {leader} recebeu {pct}% dos votos válidos.',
  'preview.pair': '{note}{intro}, {ano}, {turno}º turno: votaram {voted}% do eleitorado; dos votos válidos, {first} recebeu {firstPct}% e {second} {secondPct}%.',
}

registerSentences('pt-BR', 'standard', PREVIEW_STANDARD)
