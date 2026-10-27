/**
 * The report list of the hub (frame "6 Relatórios"): seven rows, each with its headline figure,
 * computed at build time (nothing on the hub is a copied constant). Every row is a built report and links through.
 */
import { displayName } from '@/shared/city-search'
import { biggestSwing, closestRaces, citiesWonInRunoff, MIN_BIG_SWING_VALIDOS, MIN_TURNOUT_APTOS, flipsToLula, flipsToFlavio, turnoutExtremes, type ComputedReports, type MarginInput } from './compute'
import { formatFixedPct, formatInt, formatSignedInt, formatSignedPp } from './format'

export interface HubRow {
  id: string
  title: string
  /** The headline figure, computed from the dataset (absent on the two entries that are lists, not reports). */
  headline?: string
  /** The route of the report; every hub report is built and linked (since #14 landed). */
  to?: string
}

/** "211 cidades" / "1" — the frame 6 headline writes the singular without the noun ("virou 1"). */
function countCities(n: number): string {
  return n === 1 ? formatInt(n) : `${formatInt(n)} cidades`
}

export function hubRows(reports: ComputedReports, input: MarginInput): HubRow[] {
  const { margins, netVotes, pair } = reports
  const lula = displayName(pair.nomePrimeiro)
  const flavio = displayName(pair.nomeSegundo)

  const biggest = biggestSwing(margins, MIN_BIG_SWING_VALIDOS)
  const race = closestRaces(margins)[0]
  const turnout = turnoutExtremes(input)

  return [
    {
      id: 'cidades-que-viraram',
      title: 'Cidades que viraram no 2º turno',
      headline: `${lula} virou ${countCities(flipsToLula(margins).length)}; ${flavio} virou ${countCities(flipsToFlavio(margins).length)}`,
      to: '/relatorios/cidades-que-viraram/',
    },
    {
      id: 'maiores-viradas',
      title: 'Maiores viradas, cidades de 100 mil+ votos',
      headline: biggest ? `Maior variação: ${displayName(biggest.nome)}/${biggest.uf.toUpperCase()}, ${formatSignedPp(biggest.swing)}` : `Nenhuma cidade de ${formatInt(MIN_BIG_SWING_VALIDOS)}+ votos válidos`,
      to: '/relatorios/maiores-viradas/',
    },
    {
      id: 'votos-ganhos-e-perdidos',
      title: 'Votos ganhos e perdidos vs. 2022',
      headline: `${lula}: ${formatSignedInt(netVotes.primeiro.total)} votos no país`,
      to: '/relatorios/votos-ganhos-e-perdidos/',
    },
    {
      id: 'disputas-mais-apertadas',
      title: 'Disputas mais apertadas',
      headline: race
        ? `${displayName(race.nome)}/${race.uf.toUpperCase()}: ${race.diff === 0 ? `empate, diferença de ${formatInt(race.diff)} votos` : `margem de ${formatSignedPp(race.margin)}`}`
        : undefined,
      to: '/relatorios/disputas-mais-apertadas/',
    },
    {
      id: 'comparecimento',
      title: 'Comparecimento mais alto e mais baixo',
      headline:
        turnout.high && turnout.low
          ? `Mais alto: ${displayName(turnout.high.nome)}/${turnout.high.uf.toUpperCase()}, ${formatFixedPct(turnout.high.rate)}. Mais baixo: ${displayName(turnout.low.nome)}/${turnout.low.uf.toUpperCase()}, ${formatFixedPct(turnout.low.rate)}`
          : `Nenhuma cidade de ${formatInt(MIN_TURNOUT_APTOS)}+ eleitores`,
      to: '/relatorios/comparecimento/',
    },
    {
      id: 'comparar',
      title: 'Comparar com 2022 e 2018',
      headline: `Os seis maiores estados: ${lula} e ${flavio}, votos e percentuais`,
      to: '/comparar/2022/', // built by ticket #14
    },
    {
      id: 'como-cada-grupo-votou',
      title: 'Como cada grupo votou',
      headline: 'Cidades agrupadas por quem venceu em 2018 e 2022',
      to: '/relatorios/como-cada-grupo-votou/', // built by ticket #15
    },
  ]
}