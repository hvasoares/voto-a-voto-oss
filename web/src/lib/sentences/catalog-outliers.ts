/**
 * The sentences of "Cidades fora da curva" (#34), kept out of `catalog.ts` like `catalog-duel.ts`: only the modules of that report import this file, and
 * importing it registers the sentences in `CATALOG`. Same rules as the catalog: data, templates with `{name}` slots, both registers, reviewed like code.
 *
 * Wording rule of this report: it is a SCREENING list. It says so above the list and in the share text, it never says a city is irregular, suspicious or
 * wrong, it gives no cause, and it has no sentence that names a city (the share text carries no city at all). A city is "far from its peers" in two numbers
 * and nothing more.
 */
import { registerSentences, type Key } from './catalog'

export const OUTLIER_KEYS = [
  'outlier.screening',
  'outlier.legend',
  'outlier.row.turnout',
  'outlier.row.swing',
  'outlier.row.validos',
  'outlier.col.rank',
  'outlier.col.city',
  'outlier.col.turnout',
  'outlier.col.typical',
  'outlier.col.gap',
  'outlier.col.swing',
  'outlier.col.validos',
  'outlier.filter.label',
  'outlier.filter.uf',
  'outlier.filter.ufAll',
  'outlier.filter.min',
  'outlier.min.k',
  'outlier.min.one',
  'outlier.count',
  'outlier.where.all',
  'outlier.where.uf',
  'outlier.empty',
  'outlier.note',
  'outlier.sign',
  'outlier.method',
  'outlier.share',
  'outlier.share.text',
] as const satisfies readonly Key[]

export const OUTLIER_STANDARD: Record<(typeof OUTLIER_KEYS)[number], string> = {
  'outlier.screening': 'Lista de triagem, não uma conclusão: cidades mais distantes de cidades parecidas no comparecimento e na virada desde 2022.',
  'outlier.legend': 'Comparecimento da cidade → típico entre cidades parecidas',
  'outlier.row.turnout': '{pct} (típico {typical})',
  'outlier.row.swing': 'virada desde 2022 {swing} pp (típica {typical} pp)',
  'outlier.row.validos': '{n} votos válidos',
  'outlier.col.rank': '#',
  'outlier.col.city': 'Cidade',
  'outlier.col.turnout': 'Comparecimento',
  'outlier.col.typical': 'Típico entre pares',
  'outlier.col.gap': 'Diferença',
  'outlier.col.swing': 'Virada desde 2022',
  'outlier.col.validos': 'Votos válidos',
  'outlier.filter.label': 'Filtros da lista',
  'outlier.filter.uf': 'Estado: {name}',
  'outlier.filter.ufAll': 'todos',
  'outlier.filter.min': 'Mínimo: {n} votos',
  'outlier.min.k': '{n} mil',
  'outlier.min.one': '{n}',
  'outlier.count': 'Mostrando {shown} de {compared} cidades com {min} ou mais votos válidos no 2º turno de 2026, {where}.',
  'outlier.where.all': 'em todo o país',
  'outlier.where.uf': 'em {name}',
  'outlier.empty': 'Nenhuma cidade com {min} ou mais votos válidos {where}.',
  'outlier.note': 'Pontos de partida para checar os dados, não conclusões. Cidades abaixo do mínimo de votos válidos ficam ocultas por padrão.',
  'outlier.sign': 'Virada desde 2022: quanto a margem entre {a} e {b} no 2º turno mudou, em pontos percentuais. O sinal + quer dizer que a margem cresceu no sentido de {a}; o sinal −, no de {b}.',
  'outlier.method': 'Cada cidade é comparada com as cinco cidades parecidas do arquivo de pares (porte, comparecimento, margem e histórico). O típico é a mediana delas. A ordem é a distância nos dois números, na mesma escala.',
  'outlier.share': 'Compartilhar',
  'outlier.share.text': 'Lista de triagem, não uma conclusão: cidades mais distantes de cidades parecidas no comparecimento e na virada desde 2022.',
}

export const OUTLIER_PLAIN: Record<(typeof OUTLIER_KEYS)[number], string> = {
  'outlier.screening': 'Esta é uma lista para triagem. Não é uma conclusão. Ela mostra as cidades mais distantes de cidades parecidas no comparecimento e na virada desde 2022.',
  'outlier.legend': 'Comparecimento da cidade → o comum entre cidades parecidas',
  'outlier.row.turnout': '{pct} (comum {typical})',
  'outlier.row.swing': 'virada desde 2022 {swing} pp (comum {typical} pp)',
  'outlier.row.validos': '{n} votos válidos',
  'outlier.col.rank': '#',
  'outlier.col.city': 'Cidade',
  'outlier.col.turnout': 'Comparecimento',
  'outlier.col.typical': 'Comum entre parecidas',
  'outlier.col.gap': 'Diferença',
  'outlier.col.swing': 'Virada desde 2022',
  'outlier.col.validos': 'Votos válidos',
  'outlier.filter.label': 'Filtros da lista',
  'outlier.filter.uf': 'Estado: {name}',
  'outlier.filter.ufAll': 'todos',
  'outlier.filter.min': 'Mínimo: {n} votos',
  'outlier.min.k': '{n} mil',
  'outlier.min.one': '{n}',
  'outlier.count': 'Mostrando {shown} de {compared} cidades com {min} ou mais votos válidos no 2º turno de 2026, {where}.',
  'outlier.where.all': 'em todo o país',
  'outlier.where.uf': 'em {name}',
  'outlier.empty': 'Nenhuma cidade com {min} ou mais votos válidos {where}.',
  'outlier.note': 'São pontos de partida para checar os dados. Não são conclusões. As cidades com menos votos válidos que o mínimo ficam escondidas, a menos que você mude o filtro.',
  'outlier.sign': 'Virada desde 2022: quanto a margem entre {a} e {b} no 2º turno mudou, em pontos percentuais. O sinal + quer dizer que a margem ficou maior para {a}. O sinal − quer dizer que ficou maior para {b}.',
  'outlier.method': 'Cada cidade é comparada com as cinco cidades parecidas do arquivo de pares: porte, comparecimento, margem e histórico. O comum é o valor do meio entre elas. A ordem mostra a distância nos dois números, na mesma escala.',
  'outlier.share': 'Compartilhar',
  'outlier.share.text': 'Esta é uma lista para triagem, não uma conclusão: cidades mais distantes de cidades parecidas no comparecimento e na virada desde 2022.',
}

registerSentences('pt-BR', 'standard', OUTLIER_STANDARD)
registerSentences('pt-BR', 'plain', OUTLIER_PLAIN)
