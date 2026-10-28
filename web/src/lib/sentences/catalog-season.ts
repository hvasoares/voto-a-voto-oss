/**
 * The sentences of the state season (#42, #43), kept out of `catalog.ts` like `catalog-game.ts`: only the season's modules import this file, and importing it registers the sentences
 * in `CATALOG`. Wording rule: they state what the numbers show (a share of the valid votes, a number of cities), never why, never a winner. The pivot says how the share of the
 * first candidate of the page moved between the 2nd rounds of 2022 and 2026 and in how many cities the side with the most votes changed, or that nothing did.
 */
import { CATALOG } from './catalog'

export const SEASON_STANDARD: Record<string, string> = {
  'season.sub': 'Temporada em três episódios · Presidente, 2º turno',
  'season.episode': 'Episódio {n} · {ano}',
  'season.start': 'Ponto de partida da série',
  'season.nodata': 'Sem dados do 2º turno deste ciclo',
  'season.pivot.change': 'Entre 2022 e 2026, a parcela de {label} nos votos válidos do 2º turno variou {pp} pp. {cities}',
  'season.pivot.steady': 'Entre 2022 e 2026 nada mudou: a parcela de {label} nos votos válidos do 2º turno ficou em {pct}% e, em nenhuma das {total} cidades com os três ciclos, o lado com mais votos mudou.',
  'season.pivot.single': 'Este estado tem uma só cidade. Entre 2022 e 2026, nela, o lado com mais votos no 2º turno {changed}.',
  'season.pivot.single.yes': 'mudou',
  'season.pivot.single.no': 'não mudou',
  'season.pivot.missing': 'Sem o resultado do 2º turno de {years} neste estado, não dá para comparar 2022 e 2026.',
  'season.cities.zero': 'Em nenhuma das {total} cidades com os três ciclos o lado com mais votos mudou.',
  'season.cities.one': 'Em 1 das {total} cidades com os três ciclos o lado com mais votos mudou.',
  'season.cities.other': 'Em {n} das {total} cidades com os três ciclos o lado com mais votos mudou.',
  'season.order.label': 'Ordem dos episódios',
  'season.order.chrono': 'Cronológica',
  'season.order.reverse': 'De trás para frente',
  'season.order.sub.chrono': 'Temporada em três episódios · Presidente, 2º turno',
  'season.order.sub.reverse': 'Do mais recente ao mais antigo · de 2026 a 2018',
  'season.order.announce.chrono': 'Episódios em ordem cronológica: 2018, 2022, 2026.',
  'season.order.announce.reverse': 'Episódios de trás para frente: 2026, 2022, 2018.',
  'season.order.note.chrono': 'Os mesmos episódios e âncoras valem nas duas ordens. Sem scripts, a ordem é cronológica.',
  'season.order.note.reverse': 'Os mesmos episódios e âncoras valem nas duas ordens. A escolha fica só no seu navegador.',
  'season.legend': 'A cor de cada lado é a mesma nos três episódios; o nome é o do candidato do 2º turno daquele ciclo.',
}

export const SEASON_PLAIN: Record<string, string> = {
  ...SEASON_STANDARD,
  'season.pivot.change': 'De 2022 para 2026, a parte dos votos de {label} no 2º turno mudou {pp} pontos. {cities}',
  'season.pivot.steady': 'De 2022 para 2026 nada mudou: {label} ficou com {pct}% dos votos no 2º turno e, em nenhuma das {total} cidades com os três ciclos, o lado com mais votos mudou.',
  'season.cities.zero': 'Em nenhuma das {total} cidades com os três ciclos o lado com mais votos mudou.',
}

Object.assign(CATALOG['pt-BR'].standard, SEASON_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, SEASON_PLAIN)
