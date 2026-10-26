/**
 * The one-sentence takeaway of the city card, PURE: a neutral Portuguese sentence built only from the numbers
 * of a CityResult. Reused by the share picture (#7). Same wording and treatment for every candidate; no loaded words.
 *
 * Templates (N = share of the electorate that did not vote, W = share of the electorate the most voted candidate got,
 * R = same for the runner-up; the ratio is taken on the one-decimal values that are shown):
 *   frame      "Em {cidade}, no {t}º turno de {ano}, {N} do eleitorado não votou, {relação}."
 *   relação    ratio to W: > 1,15 "mais do que o mais votado, {W}, recebeu ({w})" | (1; 1,15] "um pouco mais do que ..."
 *              | = 1 "tanto quanto ..." | [0,85; 1) "quase tanto quanto ..."
 *              otherwise ratio to R: > 1,15 "mais do que {R}, o segundo mais votado, recebeu ({r})"
 *              | (1; 1,15] "um pouco mais do que {R} recebeu ({r})" | = 1 "tanto quanto {R} ..." | [0,85; 1) "quase tanto quanto {R} ..."
 *              | < 0,85 "menos do que {R}, o segundo mais votado, recebeu ({r})"
 *   tie        "{A} e {B} empataram na frente, com {w} do eleitorado cada um; {N} do eleitorado não votou."
 *              (three or more: "{k} candidatos empataram na frente, ...")
 *   runner-up tie: R becomes "cada um dos {k} candidatos empatados em segundo lugar ({nomes})"
 *   one candidate "{N} do eleitorado não votou; {A} recebeu todos os votos válidos ({a})."
 *   tiny (< 100 eleitores aptos): the same templates in counts: "24 dos 40 eleitores não votaram ... (10 votos)"
 *   nobody turned out "nenhum dos {n} eleitores aptos compareceu." | "o único eleitor apto não compareceu."
 *   zero valid votes "nenhum candidato recebeu votos válidos: todos os votos foram em branco ou nulos."
 *   everyone voted "todo o eleitorado votou em algum candidato." | no electorate "não há eleitores aptos registrados."
 */
import { formatInt, formatPct, type CandidateTally, type CityResult } from './city-model'

/** Below this many registered voters percentages are too coarse to read; the sentence uses counts. */
export const TINY_ELECTORATE = 100
const CLOSE = 0.15
const NUMBER_WORDS = ['', '', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']

const list = (names: string[]) => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`)
/** Labels that already say "Candidato X" (fixture, unnamed candidates) take the article, as in the Sketch frame. */
const ref = (nome: string) => (/^Candidat[oa]\b/.test(nome) ? `o ${nome}` : nome)

type Band = 'above' | 'slightly' | 'equal' | 'almost' | 'below'
const PHRASE: Record<Band, string> = { above: 'mais do que', slightly: 'um pouco mais do que', equal: 'tanto quanto', almost: 'quase tanto quanto', below: 'menos do que' }

function band(n: number, x: number): Band {
  if (n === x) return 'equal'
  const ratio = n / x
  if (ratio > 1 + CLOSE) return 'above'
  if (ratio > 1) return 'slightly'
  return ratio >= 1 - CLOSE ? 'almost' : 'below'
}

export function takeaway(r: CityResult, cityName: string): string {
  const head = `Em ${cityName}, no ${r.turno}º turno de ${r.ano}, `
  if (r.aptos <= 0) return `${head}não há eleitores aptos registrados.`
  if (r.comparecimento <= 0) return `${head}${r.aptos === 1 ? 'o único eleitor apto não compareceu' : `nenhum dos ${formatInt(r.aptos)} eleitores aptos compareceu`}.`
  if (r.validos <= 0) return `${head}nenhum candidato recebeu votos válidos: todos os votos foram em branco ou nulos.`
  if (r.naoVotaram <= 0) return `${head}todo o eleitorado votou em algum candidato.`

  const tiny = r.aptos < TINY_ELECTORATE
  const round1 = (x: number) => Math.round(x * 10) / 10
  // measure(votes) = what the sentence compares: electorate share (one decimal) or a head count.
  const measure = (votos: number) => (tiny ? votos : round1((votos / r.aptos) * 100))
  const show = (votos: number) => (tiny ? `${formatInt(votos)} ${votos === 1 ? 'voto' : 'votos'}` : formatPct((votos / r.aptos) * 100))
  const nonVoters = tiny
    ? `${formatInt(r.naoVotaram)} dos ${formatInt(r.aptos)} eleitores não ${r.naoVotaram === 1 ? 'votou' : 'votaram'}`
    : `${formatPct(r.notVotedShare)} do eleitorado não votou`

  const [first, second] = r.ranking as [CandidateTally, CandidateTally]
  const top = r.ranking.filter((c) => c.votos === first.votos)
  if (top.length > 1) {
    const who = top.length === 2 ? `${top[0]!.nome} e ${top[1]!.nome}` : `${top.length} candidatos`
    return `${head}${who} empataram na frente, com ${tiny ? show(first.votos) : `${show(first.votos)} do eleitorado`} cada um; ${nonVoters}.`
  }
  if (!second || second.votos <= 0) return `${head}${nonVoters}; ${ref(first.nome)} recebeu todos os votos válidos (${show(first.votos)}).`

  const n = measure(r.naoVotaram)
  const against = band(n, measure(first.votos))
  if (against !== 'below') {
    return `${head}${nonVoters}, ${PHRASE[against]} o mais votado, ${first.nome}, recebeu (${show(first.votos)}).`
  }
  const runners = r.ranking.filter((c) => c.votos === second.votos)
  const rel = band(n, measure(second.votos))
  const who = runners.length === 1 ? ref(second.nome) : `cada um dos ${NUMBER_WORDS[runners.length] || runners.length} candidatos empatados em segundo lugar (${list(runners.map((c) => c.nome))})`
  const role = (rel === 'above' || rel === 'below') && runners.length === 1 ? ', o segundo mais votado,' : ''
  return `${head}${nonVoters}, ${PHRASE[rel]} ${who}${role} recebeu (${show(second.votos)}).`
}
