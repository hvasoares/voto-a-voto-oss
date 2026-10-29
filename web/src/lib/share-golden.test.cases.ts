/**
 * The inputs of the share-picture goldens (#138): every picture has a fixed set of cases, each a function that returns the picture's SVG
 * string from hand-made data (no disk, no clock). `share-golden.test.ts` compares each with `__golden__/<picture>/<case>.svg` byte for
 * byte. The set of case names per picture can only grow (`MIN_CASES`); an existing case's input never changes.
 *
 * Cases per picture: (a) normal, (b) long names that trigger fit/wrap, (c) single-candidate / tie / no-data where the picture supports them,
 * (d) missing optional data, (e) both registers where the picture has them, (f) the Ab/Br/Nu poster abbreviations (narrow segments).
 */
import type { Candidate, State, Turnout, Vote } from '@/data'
import { buildCityResult, type CityResult } from '@/shared/city-model'
import { buildBrasil } from './brasil'
import { brasilCardSvg } from './brasil-card'
import type { CycleBlock } from './compare'
import { buildMeasures, regionPlace, statePlace, type DuelPlace } from './duel-model'
import { duelCardSvg } from './duel-card'
import type { PlaceCard } from './meu-brasil'
import { meuBrasilCardSvg } from './meu-brasil-card'
import type { Recap } from './recap'
import { recapCardSvg } from './recap-card'
import { shareCardSvg, type GuessCard, type PictureResult } from './share-card'
import { statCard, type Measure } from './sentences/stat'
import { statCardSvg, STAT_SIZE_IDS, type StatSize } from './stat-card'
import { stayHomeModel } from './stay-home-view'
import { stayHomeCardSvg } from './stay-home-card'
import type { StayHomeRow, StayHomeView } from './stay-home'
import { stickerSvg } from './sticker-card'
import { storyCardSvg } from './story-card'

export type GoldenCases = Record<string, Record<string, () => string>>

const turnout = (o: Partial<Turnout> = {}): Turnout => ({ ano: 2026, turno: 2, uf: 'rj', cdMunicipio: '1', aptos: 1000, comparecimento: 800, abstencoes: 200, brancos: 20, nulos: 30, anuladosApuSep: 0, validos: 750, ...o })
const cand = (numero: number, nome: string, turno: 1 | 2 = 2): Candidate => ({ ano: 2026, turno, candidatoNumero: numero, nomeUrna: nome, partido: 'X' })
const vote = (numero: number, votos: number, turno: 1 | 2 = 2): Vote => ({ ano: 2026, turno, uf: 'rj', cdMunicipio: '1', candidatoNumero: numero, votos })
const result = (t: Partial<Turnout>, votes: [number, number][], names: string[] = ['Ana Souza', 'Bruno Lima', 'Carla', 'Dario', 'Eva']): CityResult => {
  const turno = (t.turno ?? 2) as 1 | 2
  return buildCityResult({ turnout: turnout(t), votes: votes.map(([n, v]) => vote(n, v, turno)), candidates: votes.map(([n], i) => cand(n, names[i]!, turno)) })
}
const address = 'votoavoto.exemplo.br/rj/cidade-exemplo'

// --- the share card and the guess card -----------------------------------------------------------------------------------------------
const shareOpts = (cityName: string, o: Partial<Parameters<typeof shareCardSvg>[1]> = {}) => ({ cityName, ufLabel: 'RJ', alt: `Em ${cityName}, a frase do cartão.`, address, ...o })
const two = result({}, [[13, 450], [22, 300]])
const longNames = result({}, [[13, 450], [22, 300]], ['Luiz Inácio Lula da Silva Junior', 'Flávio Nantes Bolsonaro Filho'])
const abbrev = result({ aptos: 10000, comparecimento: 9600, abstencoes: 400, brancos: 150, nulos: 120, validos: 9330 }, [[13, 5000], [22, 4330]])
const single = result({}, [[13, 750]])
const empty: PictureResult = { ano: 2026, turno: 2, aptos: 0, validos: 0, votedPct: 0, notVotedPct: 0, voted: [], notVoted: [] }
const noValid = result({ validos: 0, brancos: 400, nulos: 400, comparecimento: 800 }, [[13, 0], [22, 0]])
const tie = result({}, [[13, 375], [22, 375]])
const three = result({ aptos: 12345, comparecimento: 9000, abstencoes: 3345, brancos: 111, nulos: 222, validos: 8667 }, [[13, 4001], [22, 3333], [30, 1333]], ['A Silva', 'B Costa', 'C Dias'])

const guess = (o: Partial<GuessCard> = {}): GuessCard => ({
  sub: 'Palpite · RJ',
  question: 'A maioria do eleitorado de Cidade Exemplo votou no mesmo lado em 2022 e em 2026?',
  result: 'Você acertou!',
  answer: 'Sim, o lado mais votado foi o mesmo nos dois ciclos.',
  ...o,
})

const SHARE: Record<string, () => string> = {
  normal: () => shareCardSvg(two, shareOpts('Cidade Teste')),
  'long-names': () => shareCardSvg(longNames, shareOpts('Cidade Teste')),
  'long-city-name': () => shareCardSvg(two, shareOpts('Santa Rita do Passa Quatro de Cima do Vale Encantado do Sul', { ufLabel: 'Exterior' })),
  'very-long-city-name': () => shareCardSvg(two, shareOpts('Pindamonhangabaguaçuzinhodoscampos Grandedomeioeoutrasmaisgrandes Cidade')),
  'single-candidate': () => shareCardSvg(single, shareOpts('Cidade Solitária')),
  tie: () => shareCardSvg(tie, shareOpts('Cidade Empatada')),
  'three-segments': () => shareCardSvg(three, shareOpts('Cidade Teste')),
  abbreviations: () => shareCardSvg(abbrev, shareOpts('Cidade Estreita')),
  'no-electorate': () => shareCardSvg(empty, shareOpts('Cidade Vazia')),
  'no-valid-votes': () => shareCardSvg(noValid, shareOpts('Cidade Branca')),
  fixture: () => shareCardSvg(two, shareOpts('Cidade Exemplo', { fixture: true })),
  'long-address': () => shareCardSvg(two, shareOpts('Cidade Teste', { address: 'votoavoto.exemplo.br/rj/cidade-com-um-nome-extremamente-comprido-do-interior' })),
  'display-size': () => shareCardSvg(two, shareOpts('Cidade Teste', { width: 540, height: 535 })),
}

const GUESS: Record<string, () => string> = {
  normal: () => shareCardSvg(empty, shareOpts('Cidade Teste', { guess: guess() })),
  wrong: () => shareCardSvg(empty, shareOpts('Cidade Teste', { guess: guess({ result: 'Você errou desta vez.', answer: 'Não, o lado mais votado mudou entre 2022 e 2026.' }) })),
  'long-text': () =>
    shareCardSvg(empty, shareOpts('Cidade Teste', { guess: guess({ question: 'A maioria absoluta do eleitorado apto de Cidade Teste votou no mesmo lado em 2018, em 2022 e em 2026, sem nenhuma virada entre os três ciclos do segundo turno?', result: 'Você acertou em cheio!', answer: 'Sim, o lado mais votado foi o mesmo nos três ciclos, sem nenhuma virada em nenhum deles, e isso vale também para o município vizinho.' }) })),
  fixture: () => shareCardSvg(empty, shareOpts('Cidade Exemplo', { fixture: true, guess: guess() })),
  'long-city-name': () => shareCardSvg(empty, shareOpts('Santa Rita do Passa Quatro de Cima do Vale Encantado do Sul', { guess: guess() })),
}

// --- the stat card ----------------------------------------------------------------------------------------------------------------------
const statResult = result({ ano: 2026, turno: 1, aptos: 1000, comparecimento: 700, abstencoes: 300, brancos: 0, nulos: 0, validos: 700 }, [[1, 400], [2, 300]], ['C1', 'C2'])
const statCase = (r: CityResult | undefined, measure: Measure, size: StatSize, cityName = 'Cidade Exemplo', o: { fixture?: boolean } = {}) => () => statCardSvg(statCard(r, measure, { cityName }), { size, address, ...o })
const STAT: Record<string, () => string> = {}
for (const size of STAT_SIZE_IDS) {
  STAT[`non-voters-${size}`] = statCase(statResult, 'nonVoters', size)
  STAT[`margin-${size}`] = statCase(statResult, 'margin', size)
  STAT[`long-city-${size}`] = statCase(statResult, 'turnout', size, 'Santa Rita do Passa Quatro de Cima do Vale Encantado do Sul')
  STAT[`unavailable-${size}`] = statCase(undefined, 'nonVoters', size)
  STAT[`fixture-${size}`] = statCase(statResult, 'turnout', size, 'Cidade Exemplo', { fixture: true })
}

// --- the recap card -------------------------------------------------------------------------------------------------------------------
const side = (label: string, tenths: number) => ({ label, pct: `${Math.floor(tenths / 10)},${tenths % 10}`, tenths })
const recapRow = (ano: number, l: number, changePp?: string, changeVs?: number, labels: [string, string] = ['Lula', 'Bolsonaro']) => ({ ano, status: 'data' as const, left: side(labels[0], l), rival: side(labels[1], 1000 - l), changePp, changeVs })
const recap = (rows: Recap['rows']): Recap => ({ uf: 'sp', rows })
const RECAP_OPTS = { stateName: 'São Paulo', address: 'votoavoto.exemplo.br/sp/resumo' }
const RECAP: Record<string, () => string> = {
  normal: () => recapCardSvg(recap([recapRow(2018, 450, undefined, undefined, ['Haddad', 'Bolsonaro']), recapRow(2022, 478, '+2,8', 2018), recapRow(2026, 512, '+3,4', 2022)]), RECAP_OPTS).svg,
  'no-data-cycle': () => recapCardSvg(recap([{ ano: 2018, status: 'no-data' }, recapRow(2022, 478), recapRow(2026, 512, '−1,2', 2022)]), RECAP_OPTS).svg,
  'long-names': () => recapCardSvg(recap([recapRow(2018, 300, undefined, undefined, ['Fernando Haddad Pereira', 'Jair Messias Bolsonaro']), recapRow(2022, 478, '+17,8', 2018, ['Luiz Inácio Lula da Silva', 'Jair Messias Bolsonaro']), recapRow(2026, 960, '+48,2', 2022, ['Luiz Inácio Lula da Silva', 'Flávio Nantes Bolsonaro'])]), RECAP_OPTS).svg,
  'narrow-bar': () => recapCardSvg(recap([recapRow(2018, 40), recapRow(2022, 970, '+93,0', 2018), recapRow(2026, 500, '−47,0', 2022)]), RECAP_OPTS).svg,
  fixture: () => recapCardSvg(recap([recapRow(2018, 450), recapRow(2022, 478, '+2,8', 2018), recapRow(2026, 512, '+3,4', 2022)]), { ...RECAP_OPTS, fixture: true }).svg,
  plain: () => recapCardSvg(recap([recapRow(2018, 450), recapRow(2022, 478, '+2,8', 2018), recapRow(2026, 512, '+3,4', 2022)]), { ...RECAP_OPTS, register: 'plain' }).svg,
  'all-no-data': () => recapCardSvg(recap([{ ano: 2018, status: 'no-data' }, { ano: 2022, status: 'no-data' }, { ano: 2026, status: 'no-data' }]), RECAP_OPTS).svg,
}

// --- the Brasil card ------------------------------------------------------------------------------------------------------------------
const REGIONS = [
  ['sudeste', 'sp', 4_100_000, 3_200_000, 2_000_000, 1_800_000],
  ['nordeste', 'ba', 2_850_000, 2_400_000, 1_500_000, 700_000],
  ['sul', 'rs', 1_470_000, 1_200_000, 450_000, 750_000],
  ['norte', 'pa', 810_000, 640_000, 320_000, 320_000],
  ['centro-oeste', 'go', 760_000, 620_000, 248_000, 372_000],
] as const
const STATES: State[] = [...REGIONS.map(([regiao, uf]) => ({ uf, regiao, municipios: 1 })), { uf: 'zz', regiao: 'exterior', municipios: 1 }]
const bTurnout = (uf: string, aptos: number, comparecimento: number, validos: number, ano = 2026): Turnout => ({ ano, turno: 2, uf, cdMunicipio: `${uf}1`, aptos, comparecimento, abstencoes: aptos - comparecimento, brancos: 1000, nulos: 2000, anuladosApuSep: 0, validos })
const bVote = (uf: string, numero: number, votos: number, ano = 2026): Vote => ({ ano, turno: 2, uf, cdMunicipio: `${uf}1`, candidatoNumero: numero, votos })
const brasilView = (names: [string, string], numbers: [number, number] = [13, 22], ano = 2026, skew = 1) =>
  buildBrasil({
    ano,
    turno: 2,
    states: STATES,
    turnout: [...REGIONS.map(([, uf, aptos, comp, a, b]) => bTurnout(uf, aptos, comp, a + b, ano)), bTurnout('zz', 300, 200, 190, ano)],
    votes: [...REGIONS.flatMap(([, uf, , , a, b]) => [bVote(uf, numbers[0], Math.round(a * skew), ano), bVote(uf, numbers[1], b, ano)]), bVote('zz', numbers[0], 100, ano), bVote('zz', numbers[1], 90, ano)],
    candidates: numbers.map((n, i) => ({ ano, turno: 2 as const, candidatoNumero: n, nomeUrna: names[i]!, partido: 'X' })),
  })
const BRASIL_OPTS = { address: 'votoavoto.exemplo.br/brasil' }
const BRASIL: Record<string, () => string> = {
  normal: () => brasilCardSvg(brasilView(['LULA', 'FLAVIO BOLSONARO']), BRASIL_OPTS).svg,
  'ballot-order-swapped': () => brasilCardSvg(brasilView(['FLAVIO BOLSONARO', 'LULA'], [10, 13]), BRASIL_OPTS).svg,
  'long-names': () => brasilCardSvg(brasilView(['LUIZ INACIO LULA DA SILVA JUNIOR', 'FLAVIO NANTES BOLSONARO FILHO']), BRASIL_OPTS).svg,
  'lopsided-bar': () => brasilCardSvg(brasilView(['LULA', 'FLAVIO BOLSONARO'], [13, 22], 2026, 0.05), BRASIL_OPTS).svg,
  fixture: () => brasilCardSvg(brasilView(['LULA', 'FLAVIO BOLSONARO']), { ...BRASIL_OPTS, fixture: true }).svg,
  'cycle-2018': () => brasilCardSvg(brasilView(['FERNANDO HADDAD', 'JAIR BOLSONARO'], [13, 17], 2018), BRASIL_OPTS).svg,
}

// --- the duel card --------------------------------------------------------------------------------------------------------------------
const sp = statePlace({ uf: 'sp', votedTenths: 789, margin2: 7.7, swing: 6.0 })
const mg = statePlace({ uf: 'mg', votedTenths: 765, margin2: -0.9, swing: 5.8 })
const sudeste = regionPlace({ regiao: 'sudeste', turnedOutTenths: 797, shareTenths: 411, votosA: 4_300_000, votosB: 4_800_000 })
const nordeste = regionPlace({ regiao: 'nordeste', turnedOutTenths: 835, shareTenths: 285, votosA: 8_200_000, votosB: 3_700_000 })
const cityOf = (name: string, uf: string, o: Partial<DuelPlace> = {}): DuelPlace => ({
  level: 'cidade',
  code: `${uf}/${name.toLowerCase().replace(/\s+/g, '-')}`,
  name,
  label: `${name} · ${uf.toUpperCase()}`,
  figures: { comparecimento: { text: '81%', rank: 81 }, naoVotaram: { text: '19%', rank: 19 }, margem: { text: '12,4 pp', rank: 124 }, virada: { text: '+3,0 pp', rank: 30 } },
  ...o,
})
const DUEL_OPTS = { address: 'votoavoto.exemplo.br/cara-a-cara', alt: 'Duas cidades lado a lado.', subtitle: 'Duas cidades lado a lado, 2º turno de 2026.', ano: 2026, prev: 2022, kind: 'Cidade' }
const duel = (a: DuelPlace, b: DuelPlace, level: 'cidade' | 'estado' | 'regiao', o: Partial<Parameters<typeof duelCardSvg>[3]> = {}) => duelCardSvg(a, b, buildMeasures(level, a, b), { ...DUEL_OPTS, ...o }).svg
const DUEL: Record<string, () => string> = {
  states: () => duel(sp, mg, 'estado', { kind: 'Estado', subtitle: 'Dois estados lado a lado, 2º turno de 2026.' }),
  regions: () => duel(sudeste, nordeste, 'regiao', { kind: 'Região', subtitle: 'Duas regiões lado a lado, 2º turno de 2026.' }),
  cities: () => duel(cityOf('Cidade Exemplo', 'rj'), cityOf('Outra Cidade', 'sp', { figures: { comparecimento: { text: '77%', rank: 77 }, naoVotaram: { text: '23%', rank: 23 }, margem: { text: '4,4 pp', rank: 44 }, virada: { text: '−1,0 pp', rank: -10 } } }), 'cidade', { note: 'Virada: a diferença entre os dois candidatos mudou de sinal entre 2022 e 2026.' }),
  'long-names': () => duel(cityOf('Santa Rita do Passa Quatro de Cima', 'sp'), cityOf('Pindamonhangaba dos Campos Gerais do Sul', 'rs'), 'cidade'),
  'missing-values': () => duel(cityOf('Cidade Exemplo', 'rj', { figures: {}, missingCycle: true }), cityOf('Outra Cidade', 'sp', { missingPrev: true }), 'cidade'),
  tie: () => duel(cityOf('Cidade A', 'rj'), cityOf('Cidade B', 'sp'), 'cidade'),
  fixture: () => duel(sp, mg, 'estado', { kind: 'Estado', fixture: true }),
  plain: () => duel(sp, mg, 'estado', { kind: 'Estado', register: 'plain' }),
}

// --- the Meu Brasil card and the sticker -----------------------------------------------------------------------------------------------
const cycleSide = (label: string, tenths: number, key: 'a' | 'b') => ({ label, share: tenths / 10, tenths, votes: tenths * 100, pct: `${Math.floor(tenths / 10)},${tenths % 10}`, key })
const block = (ano: number, l: number, notVotedPct = 21): CycleBlock & { notVotedPct: number; sides: unknown } => ({
  status: 'data',
  ano,
  left: cycleSide('Lula', l, 'a'),
  rival: cycleSide('Bolsonaro', 1000 - l, 'b'),
  validos: 7000,
  notVotedPct,
  sides: [{ key: 'a', pct: Math.round(l / 10) }, { key: 'b', pct: 100 - Math.round(l / 10) }],
})
const noData = (ano: number): CycleBlock => ({ status: 'no-data', ano })
const place = (name: string, ufLabel: string, cycles: CycleBlock[]) => ({ ref: { role: 'mora', uf: 'rj', slug: 'x' }, name, ufLabel, cycles }) as unknown as PlaceCard
const MB_OPTS = { address: 'votoavoto.exemplo.br/meu-brasil' }
const full = (name = 'Cidade Exemplo', uf = 'RJ') => place(name, uf, [block(2018, 450), block(2022, 520, 18), block(2026, 610, 25)])
const MEU_BRASIL: Record<string, () => string> = {
  one: () => meuBrasilCardSvg([full()], MB_OPTS).svg,
  three: () => meuBrasilCardSvg([full(), full('Outra Cidade', 'SP'), full('Boa Esperança do Norte', 'MT')], MB_OPTS).svg,
  'long-name': () => meuBrasilCardSvg([full('Santa Rita do Passa Quatro de Cima do Vale Encantado', 'Exterior')], MB_OPTS).svg,
  'no-data-cycle': () => meuBrasilCardSvg([place('Cidade Nova', 'RJ', [noData(2018), block(2022, 520, 18), block(2026, 610, 25)])], MB_OPTS).svg,
  'narrow-sides': () => meuBrasilCardSvg([place('Cidade Estreita', 'RJ', [block(2018, 10), block(2022, 990), block(2026, 500, 1)])], MB_OPTS).svg,
  fixture: () => meuBrasilCardSvg([full()], { ...MB_OPTS, fixture: true }).svg,
  plain: () => meuBrasilCardSvg([full(), full('Outra Cidade', 'SP')], { ...MB_OPTS, register: 'plain' }).svg,
}

const HEADLINE = 'Em Cidade Exemplo, o lado mais votado no 2º turno foi o mesmo em 2018, 2022 e 2026.'
const STICKER_BASE = { headline: HEADLINE, url: 'https://votoavoto.exemplo.br/meu-brasil/?mora=rj/cidade-exemplo', address: 'votoavoto.exemplo.br/meu-brasil', alt: HEADLINE }
const STICKER: Record<string, () => string> = {
  normal: () => stickerSvg(STICKER_BASE),
  fixture: () => stickerSvg({ ...STICKER_BASE, fixture: true }),
  'long-headline': () => stickerSvg({ ...STICKER_BASE, headline: `${HEADLINE} ${HEADLINE} ${HEADLINE}`.repeat(1) }),
  'very-long-headline': () => stickerSvg({ ...STICKER_BASE, headline: Array.from({ length: 12 }, () => HEADLINE).join(' ') }),
  'long-address': () => stickerSvg({ ...STICKER_BASE, address: 'votoavoto.exemplo.br/meu-brasil/com-um-endereco-muito-comprido-de-verdade' }),
  'long-url': () => stickerSvg({ ...STICKER_BASE, url: 'https://votoavoto.exemplo.br/meu-brasil/?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista&nasceu=mt/boa-esperanca-do-norte' }),
}

// --- the story card -------------------------------------------------------------------------------------------------------------------
const STORY_BASE = { kicker: 'SP · 2022 → 2026', big: '38', sentence: 'de 641 cidades de São Paulo trocaram o lado com mais votos no 2º turno entre 2022 e 2026.', address: 'votoavoto.exemplo.br/sp/historia#2', alt: '38 de 641 cidades de São Paulo trocaram o lado.' }
const STORY: Record<string, () => string> = {
  normal: () => storyCardSvg(STORY_BASE),
  fixture: () => storyCardSvg({ ...STORY_BASE, fixture: true }),
  'long-big': () => storyCardSvg({ ...STORY_BASE, big: '1.234.567.890' }),
  'long-sentence': () => storyCardSvg({ ...STORY_BASE, sentence: Array.from({ length: 6 }, () => STORY_BASE.sentence).join(' ') }),
  'long-kicker-fixture': () => storyCardSvg({ ...STORY_BASE, fixture: true, kicker: 'Distrito Federal · 2018 → 2022 → 2026, segundo turno' }),
  'long-address': () => storyCardSvg({ ...STORY_BASE, address: 'votoavoto.exemplo.br/distrito-federal/historia-do-estado-inteiro-em-oito-cartoes#2' }),
  'long-address-no-slash': () => storyCardSvg({ ...STORY_BASE, address: 'votoavoto-exemplo-br-historia-do-estado-inteiro-em-oito-cartoes-numero-dois-no-total' }),
}

// --- "Ficaram em casa" ----------------------------------------------------------------------------------------------------------------
const view: StayHomeView = { ano: 2026, turno: 1 }
const views: StayHomeView[] = [view, { ano: 2022, turno: 2 }]
const ROWS: StayHomeRow[] = [
  { uf: 'rj', aptos: 1000, naoVotaram: 250, share: 25 },
  { uf: 'sp', aptos: 3000, naoVotaram: 633, share: 21.1 },
  { uf: 'mt', aptos: 500, naoVotaram: 100, share: 20 },
]
const MANY: StayHomeRow[] = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt', 'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'rs', 'sc', 'se', 'sp', 'to'].map((uf, i) => ({ uf, aptos: 1000 + i, naoVotaram: 150 + i * 6, share: 15 + i * 0.6 }))
const sh = (rows: StayHomeRow[], v = view, register?: 'plain') => stayHomeModel({ view: v, views, rows, claim: { cities: 10, greater: 5, tenths: 500 }, register })
const SH_OPTS = { address: 'exemplo.test/mapa/ficaram-em-casa' }
const STAY_HOME: Record<string, () => string> = {
  normal: () => stayHomeCardSvg(sh(ROWS), SH_OPTS).svg,
  'all-states': () => stayHomeCardSvg(sh(MANY), SH_OPTS).svg,
  'second-round': () => stayHomeCardSvg(sh(ROWS, { ano: 2022, turno: 2 }), SH_OPTS).svg,
  fixture: () => stayHomeCardSvg(sh(ROWS), { ...SH_OPTS, fixture: true }).svg,
  plain: () => stayHomeCardSvg(sh(ROWS, view, 'plain'), { ...SH_OPTS, register: 'plain' }).svg,
  'long-address': () => stayHomeCardSvg(sh(ROWS), { address: 'votoavoto.exemplo.test/mapa/ficaram-em-casa/com-um-endereco-muito-comprido' }).svg,
  'no-states': () => stayHomeCardSvg(sh([]), SH_OPTS).svg,
}

export const GOLDEN_CASES: GoldenCases = { share: SHARE, guess: GUESS, stat: STAT, recap: RECAP, brasil: BRASIL, duel: DUEL, 'meu-brasil': MEU_BRASIL, sticker: STICKER, story: STORY, 'stay-home': STAY_HOME }

/** The number of cases per picture at the first checkpoint: it cannot go down. */
export const MIN_CASES: Record<string, number> = { share: 13, guess: 5, stat: 15, recap: 7, brasil: 6, duel: 8, 'meu-brasil': 7, sticker: 6, story: 7, 'stay-home': 7 }
