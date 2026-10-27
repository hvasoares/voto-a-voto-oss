/**
 * The message catalog: every sentence the city card, the share text and the picture's text alternative say lives HERE
 * as data (templates with `{name}` slots), reviewed like code. No CMS, no free text elsewhere.
 *
 * - `KEYS` is the one list of catalog keys. A key ending in `.one`/`.other` is a plural pair, picked with the locale's
 *   `Intl.PluralRules`.
 * - Two registers: `standard` and `plain` ("linguagem simples": short sentences, one idea each, no jargon). Portuguese
 *   (pt-BR) is complete in both (a missing key is a type error; only the `STANDARD_ONLY_KEYS` have no plain version). English and
 *   Spanish are skeletons: they translate what they have and everything else falls back (see `template`) without an error.
 * - Wording rule: say what the data shows, with the same words and treatment for every candidate; never why people
 *   voted as they did, never a winner label.
 */
import { DEFAULT_REGISTER, REGISTERS, type Register } from './register'

export const KEYS = [
  /** Shown instead of a sentence when the city has no data in the cycle. */
  'noData',
  /** The small line under the headline: where the sentence comes from. */
  'headline.note',
  /** The start of every sentence: where and when. */
  'lead.city',
  'lead.overseas',
  'noElectorate',
  'nobodyTurnedOut.one',
  'nobodyTurnedOut.other',
  'noValidVotes',
  'everyoneVoted',
  /** The "who did not vote" clause, in shares of the electorate or (tiny electorates) in head counts. */
  'nonVoters.share',
  'nonVoters.count.one',
  'nonVoters.count.other',
  'votes.count.one',
  'votes.count.other',
  'share.ofElectorate',
  'tie.two',
  'tie.many',
  'single',
  'vsLeader',
  'vsRunnerUp',
  'phrase.above',
  'phrase.slightly',
  'phrase.equal',
  'phrase.almost',
  'phrase.below',
  'runnerUp.tied',
  'runnerUp.role',
  /** The margin line (#26): the votes that would have changed the result, and how many times that fits in the people who did not vote. Plain arithmetic, no intent. */
  'margin.tie',
  'margin.gap.one',
  'margin.gap.other',
  'margin.fits.one',
  'margin.fits.other',
  'margin.exceeds',
  'margin.end',
  /** The arc label of a city (#41): who had the most votes in the 2nd round of 2018, 2022 and 2026, as a sequence. A closed list; the note says it is not a cause. */
  'arc.same',
  'arc.switched2022',
  'arc.switched2026',
  'arc.returned',
  'arc.switchedTwice',
  'arc.tie',
  'arc.missing',
  'arc.note',
  /** The twin line (#31): the closest peer city of another state, and the one-line reason, which names the features the match really uses. */
  'twin.label',
  'twin.reason',
  /** The curiosities card (#33): a comparison with the cities of the same size band, never a finding. One key per kind of fact; the rank is printed apart. */
  'curio.title',
  'curio.note',
  'curio.footer',
  'curio.back',
  'curio.link',
  'curio.link.sub',
  'curio.rank',
  'curio.td',
  'curio.tu',
  'curio.ml',
  'curio.mh',
  'curio.bl',
  'curio.bh',
  'curio.group',
  'curio.cycles.change',
  /** The one-stat card (#25): the line printed under ONE number, per measure. The number is printed apart; the line never says why. */
  'stat.nonVoters',
  'stat.margin.one',
  'stat.margin.other',
  'stat.turnout',
  'stat.unavailable',
  /** The chrome of the pictures (#38): the words drawn around the numbers, so a card exists in each language. Same in both registers. */
  'card.example',
  'card.president',
  'card.round',
  'card.noElectorate',
  'card.voted',
  'card.notVoted',
  'card.noValid',
  'card.others',
  'card.brand',
  'card.brand.fixture',
  /** The long description (`<desc>`) of a picture: what it is and where its numbers come from. */
  'card.desc',
  /** Pipe-separated words for the counts 0 to 10; a larger count is written in digits. */
  'numberWords',
  /** Put before a label that already says "Candidato X" (fixture, unnamed candidates). */
  'label.article',
  'pct.lessThan',
  'pct.moreThan',
  /** The register switch of the city card: its group label and the two choices. */
  'register.label',
  'register.standard',
  'register.plain',
  /** The meta description of a city page (what a link preview says): standard register only. */
  'preview.fixture',
  'preview.intro',
  'preview.noResult',
  'preview.noElectorate',
  'preview.noValidVotes',
  'preview.default',
] as const

export type Key = (typeof KEYS)[number]
export type Locale = 'pt-BR' | 'en' | 'es'
export const DEFAULT_LOCALE: Locale = 'pt-BR'
export { DEFAULT_REGISTER, REGISTERS, type Register }

/** Keys that read the same in both registers, so they have no plain version: the register switch's own labels and the page-head description for crawlers. */
export const STANDARD_ONLY_KEYS = ['card.example', 'card.president', 'card.round', 'card.noElectorate', 'card.voted', 'card.notVoted', 'card.noValid', 'card.others', 'card.brand', 'card.brand.fixture', 'card.desc', 'register.label', 'register.standard', 'register.plain', 'preview.fixture', 'preview.intro', 'preview.noResult', 'preview.noElectorate', 'preview.noValidVotes', 'preview.default'] as const satisfies readonly Key[]
type StandardOnly = (typeof STANDARD_ONLY_KEYS)[number]

const ptBR: Record<Key, string> = {
  noData: 'Sem dados nesse ciclo.',
  'headline.note': 'Frase gerada dos números · também o texto alternativo',
  'lead.city': 'Em {city}, no {turno}º turno de {ano}, ',
  'lead.overseas': 'No exterior, em {city}, no {turno}º turno de {ano}, ',
  noElectorate: '{lead}não há eleitores aptos registrados.',
  'nobodyTurnedOut.one': '{lead}o único eleitor apto não compareceu.',
  'nobodyTurnedOut.other': '{lead}nenhum dos {aptos} eleitores aptos compareceu.',
  noValidVotes: '{lead}nenhum candidato recebeu votos válidos: todos os votos foram em branco ou nulos.',
  everyoneVoted: '{lead}todo o eleitorado votou em algum candidato.',
  'nonVoters.share': '{share} do eleitorado não votou',
  'nonVoters.count.one': '{n} dos {aptos} eleitores não votou',
  'nonVoters.count.other': '{n} dos {aptos} eleitores não votaram',
  'votes.count.one': '{n} voto',
  'votes.count.other': '{n} votos',
  'share.ofElectorate': '{share} do eleitorado',
  'tie.two': '{lead}{a} e {b} empataram na frente, com {each} cada um; {nonVoters}.',
  'tie.many': '{lead}{count} candidatos empataram na frente, com {each} cada um; {nonVoters}.',
  single: '{lead}{nonVoters}; {name} recebeu todos os votos válidos ({value}).',
  vsLeader: '{lead}{nonVoters}, {phrase} o mais votado, {name}, recebeu ({value}).',
  vsRunnerUp: '{lead}{nonVoters}, {phrase} {who}{role} recebeu ({value}).',
  'phrase.above': 'mais do que',
  'phrase.slightly': 'um pouco mais do que',
  'phrase.equal': 'tanto quanto',
  'phrase.almost': 'quase tanto quanto',
  'phrase.below': 'menos do que',
  'runnerUp.tied': 'cada um dos {count} candidatos empatados em segundo lugar ({names})',
  'runnerUp.role': ', o segundo mais votado,',
  'margin.tie': 'Empate na frente: a diferença entre os mais votados é de 0 votos.',
  'margin.gap.one': 'Faltou {n} voto para virar',
  'margin.gap.other': 'Faltaram {n} votos para virar',
  'margin.fits.one': ': cabe {times} vez nos {m} que não votaram.',
  'margin.fits.other': ': cabem {times} vezes nos {m} que não votaram.',
  'margin.exceeds': ': mais do que os {m} que não votaram.',
  'margin.end': '.',
  'arc.same': 'Mesmo lado nos três ciclos',
  'arc.switched2022': 'Mudou de lado em 2022',
  'arc.switched2026': 'Mudou de lado em 2026',
  'arc.returned': 'Mudou de lado em 2022 e voltou em 2026',
  'arc.switchedTwice': 'Mudou de lado em 2022 e de novo em 2026',
  'arc.tie': 'Empate no 2º turno de {years}',
  'arc.missing': 'Sem dados do 2º turno de {years}',
  'arc.note': 'Descreve a sequência, não a causa.',
  'twin.label': 'Cidade gêmea: {name} · {uf}',
  'twin.reason': 'Perfil parecido de porte, participação, margem e histórico.',
  'curio.title': 'Curiosidades · comparada com cidades parecidas',
  'curio.note': 'É uma comparação com cidades do mesmo perfil, não um indício de irregularidade.',
  'curio.footer': 'Cidades com poucos pares não mostram este cartão. Cada fato diz o tamanho do grupo e os ciclos comparados.',
  'curio.back': 'Voltar ao cartão da cidade',
  'curio.link': 'Curiosidades da cidade',
  'curio.link.sub': 'Comparada com cidades parecidas',
  'curio.rank': '{n}ª',
  'curio.td': 'maior queda de comparecimento entre cidades do mesmo porte',
  'curio.tu': 'maior alta de comparecimento entre cidades do mesmo porte',
  'curio.ml': 'menor diferença entre os dois candidatos no 1º turno',
  'curio.mh': 'maior diferença entre os dois candidatos no 1º turno',
  'curio.bl': 'menor parcela de votos brancos e nulos',
  'curio.bh': 'maior parcela de votos brancos e nulos',
  'curio.group': 'Grupo: {n} cidades · {cycles}',
  'curio.cycles.change': '{from} → {to}',
  'stat.nonVoters': 'do eleitorado de {city} não votou no {turno}º turno de {ano}.',
  'stat.margin.one': 'voto separou os dois candidatos mais votados em {city}, no {turno}º turno de {ano}.',
  'stat.margin.other': 'votos separaram os dois candidatos mais votados em {city}, no {turno}º turno de {ano}.',
  'stat.turnout': 'do eleitorado de {city} compareceu no {turno}º turno de {ano}.',
  'stat.unavailable': 'Esta medida não se aplica a {city} no {turno}º turno de {ano}.',
  'card.example': 'EXEMPLO',
  'card.president': 'Presidente {ano}',
  'card.round': '{ano} · {turno}º turno · {uf}',
  'card.noElectorate': 'Sem eleitores aptos registrados',
  'card.voted': 'Votaram: {pct}% do eleitorado',
  'card.notVoted': 'Não votaram: {pct}% do eleitorado',
  'card.noValid': 'Nenhum voto válido',
  'card.others': 'Outros',
  'card.brand': 'Voto a Voto · Fonte: TSE',
  'card.brand.fixture': 'Voto a Voto · Dados fictícios. Fonte real: TSE.',
  'card.desc': 'Imagem do Voto a Voto com números do TSE, edição {edition}. Endereço: {address}.',
  numberWords: 'zero|um|dois|três|quatro|cinco|seis|sete|oito|nove|dez',
  'label.article': 'o {name}',
  'pct.lessThan': 'menos de {pct}',
  'pct.moreThan': 'mais de {pct}',
  'register.label': 'Estilo da frase',
  'register.standard': 'Padrão',
  'register.plain': 'Linguagem simples',
  'preview.fixture': 'Dados fictícios (EXEMPLO). ',
  'preview.intro': 'Resultado de {place}',
  'preview.noResult': '{note}{intro}: o arquivo do TSE não traz votação para os ciclos do site.',
  'preview.noElectorate': '{note}{intro}, {ano}, {turno}º turno: sem eleitores aptos registrados.',
  'preview.noValidVotes': '{note}{intro}, {ano}, {turno}º turno: nenhum voto válido; {notVoted}% do eleitorado não votou.',
  'preview.default': '{note}{intro}, {ano}, {turno}º turno: votaram {voted}% do eleitorado e {leader} recebeu {pct}% dos votos válidos.',
}

/**
 * Linguagem simples: short sentences, one idea each, everyday words ("pessoas que podiam votar", not "eleitorado"),
 * the same figures and the same neutrality as the standard register. The slots are the same as the standard template's.
 */
const ptBRPlain: Record<Exclude<Key, StandardOnly>, string> = {
  noData: 'Não temos dados dessa eleição para este lugar.',
  'headline.note': 'Frase feita com os números desta página · também é a descrição do gráfico',
  'lead.city': 'Em {city}, no {turno}º turno de {ano}, ',
  'lead.overseas': 'No exterior, em {city}, no {turno}º turno de {ano}, ',
  noElectorate: '{lead}não havia pessoas registradas para votar.',
  'nobodyTurnedOut.one': '{lead}a única pessoa que podia votar não foi votar.',
  'nobodyTurnedOut.other': '{lead}nenhuma das {aptos} pessoas que podiam votar foi votar.',
  noValidVotes: '{lead}nenhum candidato recebeu votos. Todos os votos foram em branco ou anulados.',
  everyoneVoted: '{lead}todas as pessoas votaram em algum candidato.',
  'nonVoters.share': '{share} das pessoas que podiam votar não votaram',
  'nonVoters.count.one': '{n} de {aptos} pessoas que podiam votar não votou',
  'nonVoters.count.other': '{n} de {aptos} pessoas que podiam votar não votaram',
  'votes.count.one': '{n} voto',
  'votes.count.other': '{n} votos',
  'share.ofElectorate': 'votos de {share} das pessoas que podiam votar',
  'tie.two': '{lead}{a} e {b} ficaram empatados na frente. Cada um recebeu {each}. {nonVoters}.',
  'tie.many': '{lead}{count} candidatos ficaram empatados na frente. Cada um recebeu {each}. {nonVoters}.',
  single: '{lead}{nonVoters}. {name} recebeu todos os votos dados a candidatos: {value}.',
  vsLeader: '{lead}{nonVoters}. {phrase} {name}, o mais votado, recebeu: {value}.',
  vsRunnerUp: '{lead}{nonVoters}. {phrase} {who}{role} recebeu: {value}.',
  'phrase.above': 'Isso é mais do que',
  'phrase.slightly': 'Isso é um pouco mais do que',
  'phrase.equal': 'Isso é igual ao que',
  'phrase.almost': 'Isso é quase igual ao que',
  'phrase.below': 'Isso é menos do que',
  'runnerUp.tied': 'cada um dos {count} candidatos empatados em segundo lugar ({names})',
  'runnerUp.role': ', o segundo mais votado,',
  'margin.tie': 'Houve empate na frente. A diferença entre os mais votados é de 0 votos.',
  'margin.gap.one': 'Faltou {n} voto para virar o resultado',
  'margin.gap.other': 'Faltaram {n} votos para virar o resultado',
  'margin.fits.one': '. Esse número cabe {times} vez nas {m} pessoas que não votaram.',
  'margin.fits.other': '. Esse número cabe {times} vezes nas {m} pessoas que não votaram.',
  'margin.exceeds': '. Esse número é maior do que as {m} pessoas que não votaram.',
  'margin.end': '.',
  'arc.same': 'Nos três ciclos, o mesmo lado teve mais votos no 2º turno',
  'arc.switched2022': 'Em 2022, o lado com mais votos no 2º turno mudou',
  'arc.switched2026': 'Em 2026, o lado com mais votos no 2º turno mudou',
  'arc.returned': 'Em 2022 o lado com mais votos mudou, e em 2026 voltou a ser o de 2018',
  'arc.switchedTwice': 'O lado com mais votos no 2º turno mudou em 2022 e mudou de novo em 2026',
  'arc.tie': 'O 2º turno terminou empatado em {years}',
  'arc.missing': 'Não temos o resultado do 2º turno de {years}',
  'arc.note': 'Só conta a ordem dos fatos. Não diz o motivo.',
  'twin.label': 'Cidade parecida: {name} · {uf}',
  'twin.reason': 'Tem número de eleitores, comparecimento e resultados parecidos nas três eleições.',
  'curio.title': 'Curiosidades · comparada com cidades parecidas',
  'curio.note': 'Isto só compara a cidade com outras parecidas. Não mostra que algo deu errado.',
  'curio.footer': 'Cidades com poucas parecidas não mostram este cartão. Cada fato diz quantas cidades foram comparadas e de que eleições.',
  'curio.back': 'Voltar ao cartão da cidade',
  'curio.link': 'Curiosidades da cidade',
  'curio.link.sub': 'Comparada com cidades parecidas',
  'curio.rank': '{n}ª',
  'curio.td': 'maior queda de comparecimento entre cidades do mesmo tamanho',
  'curio.tu': 'maior alta de comparecimento entre cidades do mesmo tamanho',
  'curio.ml': 'menor diferença de votos entre os dois primeiros no 1º turno, entre cidades do mesmo tamanho',
  'curio.mh': 'maior diferença de votos entre os dois primeiros no 1º turno, entre cidades do mesmo tamanho',
  'curio.bl': 'menor parte de votos em branco e nulos entre cidades do mesmo tamanho',
  'curio.bh': 'maior parte de votos em branco e nulos entre cidades do mesmo tamanho',
  'curio.group': 'Grupo: {n} cidades · {cycles}',
  'curio.cycles.change': '{from} → {to}',
  'stat.nonVoters': 'das pessoas que podiam votar em {city} não votaram no {turno}º turno de {ano}.',
  'stat.margin.one': 'voto de diferença entre os dois candidatos mais votados em {city}, no {turno}º turno de {ano}.',
  'stat.margin.other': 'votos de diferença entre os dois candidatos mais votados em {city}, no {turno}º turno de {ano}.',
  'stat.turnout': 'das pessoas que podiam votar em {city} foram votar no {turno}º turno de {ano}.',
  'stat.unavailable': 'Não há esse número para {city} no {turno}º turno de {ano}.',
  numberWords: 'zero|um|dois|três|quatro|cinco|seis|sete|oito|nove|dez',
  'label.article': 'o {name}',
  'pct.lessThan': 'menos de {pct}',
  'pct.moreThan': 'mais de {pct}',
}

/** Skeletons: a few keys each, to show the shape of a translation. Everything missing reads in Portuguese. */
const en: Partial<Record<Key, string>> = {
  noData: 'No data for this cycle.',
  'card.example': 'EXAMPLE',
  'card.president': 'President {ano}',
  'card.round': '{ano} · round {turno} · {uf}',
  'card.noElectorate': 'No registered voters',
  'card.voted': 'Voted: {pct}% of the electorate',
  'card.notVoted': 'Did not vote: {pct}% of the electorate',
  'card.noValid': 'No valid votes',
  'card.others': 'Others',
  'card.brand': 'Voto a Voto · Source: TSE',
  'card.brand.fixture': 'Voto a Voto · Fictitious data. Real source: TSE.',
  'card.desc': 'Voto a Voto picture with TSE numbers, edition {edition}. Address: {address}.',
  'lead.city': 'In {city}, in round {turno} of {ano}, ',
  'lead.overseas': 'Abroad, in {city}, in round {turno} of {ano}, ',
  noElectorate: '{lead}there are no registered voters.',
}

const es: Partial<Record<Key, string>> = {
  noData: 'Sin datos en este ciclo.',
  'card.example': 'EJEMPLO',
  'card.president': 'Presidente {ano}',
  'card.round': '{ano} · {turno}.ª vuelta · {uf}',
  'card.noElectorate': 'Sin electores registrados',
  'card.voted': 'Votaron: {pct}% del electorado',
  'card.notVoted': 'No votaron: {pct}% del electorado',
  'card.noValid': 'Ningún voto válido',
  'card.others': 'Otros',
  'card.brand': 'Voto a Voto · Fuente: TSE',
  'card.brand.fixture': 'Voto a Voto · Datos ficticios. Fuente real: TSE.',
  'card.desc': 'Imagen de Voto a Voto con números del TSE, edición {edition}. Dirección: {address}.',
  'lead.city': 'En {city}, en la {turno}.ª vuelta de {ano}, ',
  'lead.overseas': 'En el exterior, en {city}, en la {turno}.ª vuelta de {ano}, ',
  noElectorate: '{lead}no hay electores registrados.',
}

type Messages = Partial<Record<Key, string>>
export const CATALOG: { [L in Locale]: { standard: Messages; plain: Messages } } = {
  'pt-BR': { standard: ptBR, plain: ptBRPlain },
  en: { standard: en, plain: {} },
  es: { standard: es, plain: {} },
}

/** What a sentence is said in: a language and a register. */
export interface Voice {
  locale: Locale
  register: Register
}
export const DEFAULT_VOICE: Voice = { locale: DEFAULT_LOCALE, register: DEFAULT_REGISTER }

/**
 * The template of `key` for `voice`. A missing translation never errors: the voice's own register, then the same locale's
 * standard register, then Portuguese in the asked register, and last standard Portuguese (which is always complete).
 */
export function template({ locale, register }: Voice, key: Key): string {
  return CATALOG[locale]?.[register]?.[key] ?? CATALOG[locale]?.standard?.[key] ?? CATALOG['pt-BR'][register][key] ?? ptBR[key]
}

/** Fills `{slot}`s; an unknown slot is left visible as `{slot}` so a typo cannot pass silently in a test. */
export function fill(tpl: string, params: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole))
}

/** The keys that come as a `.one` / `.other` pair. */
export type PluralKey = 'nobodyTurnedOut' | 'nonVoters.count' | 'votes.count' | 'margin.gap' | 'margin.fits' | 'stat.margin'

/** Zero reads as "other" ("0 votos"), although CLDR files 0 under "one" for Portuguese. */
export function pluralCategory(locale: Locale, count: number): 'one' | 'other' {
  return count !== 0 && new Intl.PluralRules(locale).select(count) === 'one' ? 'one' : 'other'
}

/** What `message` takes: a key, or the base of a plural pair (then `count` picks `.one` or `.other`). */
export type MessageKey = Exclude<Key, `${string}.one` | `${string}.other`> | PluralKey

/** The sentence of `key` for `voice` with its slots filled; a plural key takes `count`. */
export function message(voice: Voice, key: MessageKey, params: Record<string, string | number> = {}, count?: number): string {
  const k = (count === undefined ? key : `${key}.${pluralCategory(voice.locale, count)}`) as Key
  return fill(template(voice, k), params)
}
