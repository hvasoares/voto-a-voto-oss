/**
 * The sentences of the state story (#47) and of the Meu Brasil story (#97), kept out of `catalog.ts` like `catalog-game.ts`: only the story modules import this file, and importing it
 * registers the sentences in `CATALOG`. Wording rule: each card says one thing about places (a count of cities, a number of municipalities), the way the data shows it, never why, never a
 * winner or a loser, never anything about a person. The limit of a card's sentence is `STORY_TEXT_MAX` in `story.ts`, enforced by the build.
 */
import { CATALOG } from './catalog'

export const STORY_STANDARD: Record<string, string> = {
  'story.title': 'História de {name}',
  'story.sub': 'Sequência de {n} cartões · deslize para o lado',
  'story.sub.list': 'Sequência de {n} cartões',
  'story.region': 'Sequência de cartões de {name}',
  'story.of.one': 'de 1 cidade',
  'story.of.other': 'de {total} cidades',
  'story.card.cities': 'municípios em {name}. Os próximos cartões contam o 2º turno de 2018, 2022 e 2026 neles.',
  'story.card.turned2026': '{of} de {name}, com os três ciclos, tiveram mudança do lado com mais votos no 2º turno entre 2022 e 2026.',
  'story.card.turned2022': '{of} de {name}, com os três ciclos, tiveram mudança do lado com mais votos no 2º turno entre 2018 e 2022.',
  'story.card.returned': '{of} de {name}, com os três ciclos, mudaram de lado em 2022 e em 2026 voltaram ao lado de 2018.',
  'story.card.steady': '{of} de {name}, com os três ciclos, tiveram o mesmo lado com mais votos no 2º turno em 2018, 2022 e 2026.',
  'story.card.recap': 'Os três ciclos do estado, lado a lado.',
  'story.card.share': 'cartões sobre o 2º turno de {name} em 2018, 2022 e 2026. Os números são do TSE.',
  'story.kicker.cities': 'O estado',
  'story.kicker.turned2026': '2022 → 2026',
  'story.kicker.turned2022': '2018 → 2022',
  'story.kicker.returned': '2018 → 2026',
  'story.kicker.steady': '2018 → 2026',
  'story.kicker.recap': '2018 · 2022 · 2026',
  'story.kicker.share': 'Para compartilhar',
  'story.caption': 'Cartão {n} de {total}',
  'story.caption.surprising': 'Cartão {n} de {total} · o fato mais surpreendente',
  'story.link.note': 'O link leva a este cartão: {address}',
  'story.note': 'Cada cartão tem uma ideia e um número. O último é o cartão de compartilhar.',
  'story.share': 'Compartilhar este cartão',
  'story.dot': 'Ir ao cartão {n}',
  'story.dots': 'Cartões',
  'story.nojs': 'Sem scripts, os cartões aparecem em lista, na ordem.',
  'story.list.link': 'Link deste cartão',
  'mbstory.title': 'Meu Brasil em sequência',
  'mbstory.sub': 'Sequência de {n} cartões · deslize para o lado',
  'mbstory.region': 'Sequência de cartões dos lugares escolhidos',
  'mbstory.back': '‹ Meu Brasil',
  'mbstory.card.places': '{names}.',
  'mbstory.card.turnout': 'do eleitorado de {place} votou no 2º turno de {ano}.',
  'mbstory.card.nonvoters': 'pessoas em {place} não votaram no 2º turno de {ano}: abstenção, brancos e nulos.',
  'mbstory.card.arc.same': 'ciclos seguidos (2018, 2022 e 2026) com o mesmo lado com mais votos no 2º turno em {place}.',
  'mbstory.card.arc.switched2022': 'foi o ano em que o lado com mais votos no 2º turno mudou em {place}.',
  'mbstory.card.arc.switched2026': 'foi o ano em que o lado com mais votos no 2º turno mudou em {place}.',
  'mbstory.card.arc.returned': 'foi o ano em que o lado com mais votos no 2º turno mudou em {place}. Em 2026 voltou ao lado de 2018.',
  'mbstory.card.arc.switchedTwice': 'foi o ano em que o lado com mais votos no 2º turno mudou em {place}. Em 2026 mudou de novo.',
  'mbstory.card.arc.tie': 'foi o ano em que o 2º turno terminou empatado em {place}.',
  'mbstory.card.twin': 'do eleitorado de {twin}, a cidade parecida de {place}, votou no 2º turno de {ano}.',
  'mbstory.card.curiosity': '{what}. {group}.',
  'mbstory.card.share': 'cartões sobre {places}. Os números são do TSE.',
  'mbstory.card.share.generic': 'cartões sobre os lugares escolhidos. Os números são do TSE.',
  'mbstory.kicker.places': 'Os lugares',
  'mbstory.kicker.turnout': 'Comparecimento · {ano}',
  'mbstory.kicker.nonvoters': 'Quem não votou · {ano}',
  'mbstory.kicker.arc': 'Três ciclos',
  'mbstory.kicker.twin': 'Cidade gêmea',
  'mbstory.kicker.curiosity': 'Curiosidade',
  'mbstory.kicker.share': 'Para compartilhar',
  'mbstory.note': 'Cada cartão tem uma ideia e um número, sobre lugares. O último é o cartão de compartilhar.',
  'mbstory.nojs': 'A sequência é montada no navegador, a partir dos lugares do endereço, e precisa de JavaScript.',
  'mbstory.none': 'Escolha ao menos um lugar no Meu Brasil para ver a sequência.',
  'mbstory.loading': 'Carregando os lugares…',
  'mbstory.failed': 'Não foi possível carregar a sequência agora. Tente de novo.',
  'mbstory.button': 'Ver como história',
}

export const STORY_PLAIN: Record<string, string> = {
  ...STORY_STANDARD,
  'story.card.turned2026': '{of} de {name}, com os três ciclos, mudaram o lado que teve mais votos no 2º turno de 2022 para 2026.',
  'story.card.turned2022': '{of} de {name}, com os três ciclos, mudaram o lado que teve mais votos no 2º turno de 2018 para 2022.',
}

Object.assign(CATALOG['pt-BR'].standard, STORY_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, STORY_PLAIN)
