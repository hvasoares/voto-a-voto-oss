/**
 * The part of the events table the browser needs at run time (ticket #20): which events exist and which properties each may carry,
 * and nothing else. The long form (descriptions, files that emit each event) is `events.ts`, which only the tests and the docs read:
 * keeping the two apart keeps the table's prose out of the script every page loads. `events.test.ts` checks that this file and the
 * documented table say the same thing, so the contract still has one source of truth in practice.
 */
export const EVENT_PROPS: Readonly<Record<string, readonly string[]>> = {
  page_view: ['page_path', 'page_title'],
  search: ['scope', 'uf', 'results', 'query_length'],
  search_result_tap: ['scope', 'uf', 'position'],
  state_tile_tap: ['uf'],
  map_state_tap: ['uf'],
  map_municipio_tap: ['cd'],
  map_view: ['view'],
  city_list_tap: ['uf', 'position'],
  state_link_tap: ['uf', 'link'],
  city_view: ['uf', 'slug', 'ciclo', 'turno'],
  city_cycles_view: ['uf', 'slug', 'turno'],
  round_switch: ['uf', 'slug', 'ciclo', 'turno', 'from_turno', 'view'],
  cycle_switch: ['uf', 'slug', 'ciclo', 'turno', 'from_ciclo'],
  report_opened: ['report'],
  report_shared: ['report', 'method'],
  share_opened: ['has_picture'],
  share_completed: ['method'],
  share_cancelled: [],
  share_failed: ['method'],
  image_downloaded: ['how'],
  recap_opened: ['uf'],
  recap_shared: ['uf'],
  meu_brasil_place_added: ['role', 'places'],
  meu_brasil_shared: ['places'],
  card_generator_opened: ['has_city'],
  card_size_chosen: ['size'],
  card_image_downloaded: ['size', 'measure'],
  card_svg_downloaded: ['size', 'measure'],
  qr_screen_shown: [],
  poster_printed: [],
}

export const EVENT_NAMES: ReadonlySet<string> = new Set(Object.keys(EVENT_PROPS))

/** The properties a given event may send (everything else is dropped by the GA4 provider). */
export const eventProps = (name: string): ReadonlySet<string> => new Set(EVENT_PROPS[name] ?? [])
