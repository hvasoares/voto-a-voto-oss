/**
 * The words the Home page's script says in the browser (#105), DATA ONLY and importing nothing: `scripts/home-place.ts` reads this file directly, so it must stay tiny and apart from the catalog.
 * A sub-line that asks for a city ("Escolha a cidade...") reads as the remembered one; it states which city and nothing else.
 */
export const HOME_SAY: Record<string, string> = {
  'home.place.remembered': 'Cidade lembrada: {nome}',
}
