/**
 * The words the Home page's script says in the browser (#105, #147), DATA ONLY and importing nothing at run time: `scripts/home-place.ts` reads this file directly, so it must stay tiny and apart from the catalog.
 * A sub-line that asks for a city ("Escolha a cidade...") reads as the remembered one; it states which city and nothing else.
 * The hint above the search says what picking a city will do, one line per destination of `lib/destinations.ts` (the keys are `home.hint.<destination>`), in both registers.
 * `catalog-hint.ts` registers the same data in the sentence catalog (`KEYS`), so the catalog tests cover it.
 */
export const HOME_SAY: Record<string, string> = {
  'home.place.remembered': 'Cidade lembrada: {nome}',
}

export const HOME_HINT_KEYS = ['home.hint.cidade', 'home.hint.compartilhar', 'home.hint.tres-ciclos', 'home.hint.cara-a-cara'] as const

export const HOME_HINT_STANDARD: Record<(typeof HOME_HINT_KEYS)[number], string> = {
  'home.hint.cidade': 'Escolha a cidade para ver o resultado dela.',
  'home.hint.compartilhar': 'Escolha a cidade para compartilhar o resultado.',
  'home.hint.tres-ciclos': 'Escolha a cidade para ver 2018, 2022 e 2026 lado a lado.',
  'home.hint.cara-a-cara': 'Escolha a primeira cidade; a segunda vem depois.',
}

export const HOME_HINT_PLAIN: Record<(typeof HOME_HINT_KEYS)[number], string> = {
  'home.hint.cidade': 'Escolha a cidade. Você vai ver o resultado dela.',
  'home.hint.compartilhar': 'Escolha a cidade. Depois você pode compartilhar o resultado.',
  'home.hint.tres-ciclos': 'Escolha a cidade. Você vai ver 2018, 2022 e 2026.',
  'home.hint.cara-a-cara': 'Escolha a primeira cidade. A outra você escolhe depois.',
}
