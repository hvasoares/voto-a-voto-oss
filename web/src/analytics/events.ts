/**
 * The ONE documented list of analytics events (ticket #20). Every name the site emits and every property
 * it carries is here — screens call `getAnalytics().event('<name>'[, props])` with nothing outside this
 * table, and src/analytics/ga4.ts drops anything that is not table-compliant before it reaches Google.
 * Properties are coarse only: UF, city slug, report name, election cycle, counts. NEVER the text a
 * visitor typed, never anything personal, never an identifier beyond what GA itself sets.
 *
 * Naming note: the events below are the vocabulary the site already wires (src/analytics/index.ts
 * interface). "city_viewed" is `city_view`, "search_used" is `search` (counts only), "share_copied" is
 * `share_completed{method:'clipboard'…}` — see each row.
 */

export interface EventDoc {
  name: string
  /** What it means, in English for the team's reports (the site text stays Portuguese). */
  description: string
  /** Property name → one-line meaning. Extra properties are dropped by the GA4 provider. */
  props: Record<string, string>
  /** Files that emit it (checked by src/analytics/events.test.ts against the real sources). */
  emitted: string[]
}

export const EVENTS: EventDoc[] = [
  {
    name: 'page_view',
    description: 'One per page load, on every route of the static site (no SPA transitions).',
    props: {
      page_path: 'URL path of the page (includes the base path, e.g. /voto-a-voto-oss/ on the project pages), relative form',
      page_title: 'The document title (page name · Voto a Voto)',
    },
    emitted: ['src/scripts/analytics-boot.ts'],
  },
  {
    name: 'search',
    description: 'A city search was used. Counts only — never the text (home and /:uf/ list variants).',
    props: {
      scope: "Present on the state page only: 'state'. The home search carries no scope.",
      uf: 'The state of the list (state page search only)',
      results: 'How many cities matched the query',
      query_length: 'Character count of the query (the exact text never leaves the browser)',
    },
    emitted: ['src/slots/home/search-ui.ts', 'src/slots/state/state-search.ts'],
  },
  {
    name: 'search_result_tap',
    description: 'A search result (a city) was opened.',
    props: {
      scope: "Present on the state page only: 'state'.",
      uf: 'State of the tapped city',
      position: '1-based position in the results list',
    },
    emitted: ['src/slots/home/search-ui.ts', 'src/slots/state/state-search.ts'],
  },
  {
    name: 'state_tile_tap',
    description: 'A state tile was tapped: the home UF grid — ticket #20’s state_tapped.',
    props: { uf: 'The two-letter state code tapped' },
    emitted: ['src/scripts/tile-analytics.ts', 'src/slots/home/search-ui.ts'],
  },
  {
    name: 'map_state_tap',
    description: 'A state was tapped on the Brasil map (tile selected, not navigated).',
    props: { uf: 'The two-letter state code tapped' },
    emitted: ['src/components/StateMapMap.tsx'],
  },
  {
    name: 'map_municipio_tap',
    description: 'A municipality was tapped on a state map (tapped for detail, not navigated).',
    props: { cd: 'IBGE municipality code (coarse: no name, no personal data)' },
    emitted: ['src/components/CityMapMap.tsx'],
  },
  {
    name: 'map_view',
    description: 'The map panel changed presentation or measure (Mosaico/Mapa tabs, margin/swing).',
    props: { view: 'The view chosen (e.g. lista | mapa | margin | swing)' },
    emitted: ['src/components/CityMapMap.tsx', 'src/components/StateMapMap.tsx'],
  },
  {
    name: 'city_list_tap',
    description: 'A city list row was tapped on the state page.',
    props: { uf: 'State of the state page', position: '1-based position in the list' },
    emitted: ['src/slots/state/state-search.ts'],
  },
  {
    name: 'state_link_tap',
    description: 'A state page link was tapped (to the map or to the three-cycle page).',
    props: { uf: 'State of the state page', link: 'map | cycles | recap' },
    emitted: ['src/slots/state/state-search.ts'],
  },
  {
    name: 'city_view',
    description: 'The city card (/:uf/:slug/) was opened — ticket #20’s city_viewed.',
    props: { uf: 'State code', slug: 'City slug', ciclo: 'Election year of the view (2018/2022/2026)', turno: 'Round (1 or 2)' },
    emitted: ['src/slots/city/city-view.ts'],
  },
  {
    name: 'city_cycles_view',
    description: 'The three-cycle page (/:uf/:slug/tres-ciclos/) was opened.',
    props: { uf: 'State code', slug: 'City slug', turno: 'Round shown' },
    emitted: ['src/slots/city-cycles/cycles-track.ts'],
  },
  {
    name: 'round_switch',
    description: 'The visitor switched the round (1º/2º turno) on the card or three-cycle page.',
    props: {
      uf: 'State code',
      slug: 'City slug',
      ciclo: 'Election year shown (card switches only)',
      turno: 'Round switched to',
      from_turno: 'Round switched from',
      view: "Marker of the three-cycle page: 'tres-ciclos' (the card switches carry no view)",
    },
    emitted: ['src/slots/city/city-view.ts', 'src/slots/city-cycles/cycles-track.ts'],
  },
  {
    name: 'cycle_switch',
    description: 'The visitor switched the election year on the city card.',
    props: { uf: 'State code', slug: 'City slug', ciclo: 'Year switched to', turno: 'Round shown', from_ciclo: 'Year switched from' },
    emitted: ['src/slots/city/city-view.ts'],
  },
  {
    name: 'report_opened',
    description: 'A report page (/relatorios/…) was opened.',
    props: { report: 'Report name (data-report on the page)' },
    emitted: ['src/scripts/report-analytics.ts'],
  },
  {
    name: 'report_shared',
    description: 'A report was shared (native sheet or the link copied).',
    props: { report: 'Report name', method: 'native | clipboard' },
    emitted: ['src/scripts/report-analytics.ts'],
  },
  {
    name: 'share_opened',
    description: 'The share sheet was opened on a city share page.',
    props: { has_picture: 'Whether the share page shows the share picture card' },
    emitted: ['src/components/ShareActions.tsx'],
  },
  {
    name: 'share_completed',
    description: 'The visitor completed the share (native sheet “shared”) — ticket #20’s share_copied.',
    props: { method: "Share result method ('clipboard' when the link is copied)" },
    emitted: ['src/components/ShareActions.tsx', 'src/components/CardGenerator.tsx'],
  },
  {
    name: 'share_cancelled',
    description: 'The visitor closed the share sheet without sharing.',
    props: {},
    emitted: ['src/components/ShareActions.tsx', 'src/components/CardGenerator.tsx'],
  },
  {
    name: 'share_failed',
    description: 'The native share failed and nothing was copied (the site never breaks on it).',
    props: { method: 'Share method that failed' },
    emitted: ['src/components/ShareActions.tsx', 'src/components/CardGenerator.tsx'],
  },
  {
    name: 'image_downloaded',
    description: 'The share picture was downloaded (the picture, built in-browser; ticket #20’s image_downloaded).',
    props: { how: 'download_button | no_share_api | share_fallback' },
    emitted: ['src/components/ShareActions.tsx'],
  },
  {
    name: 'recap_opened',
    description: 'The state recap (/:uf/resumo/) was opened.',
    props: { uf: 'State code' },
    emitted: ['src/components/RecapShare.tsx'],
  },
  {
    name: 'recap_shared',
    description: 'The state recap was shared (the native sheet reported "shared").',
    props: { uf: 'State code' },
    emitted: ['src/components/RecapShare.tsx'],
  },
  {
    name: 'card_generator_opened',
    description: 'The card generator (/gerador/) was opened.',
    props: { has_city: 'Whether the address already named a city (the link from the share dialog does)' },
    emitted: ['src/components/CardGenerator.tsx'],
  },
  {
    name: 'card_size_chosen',
    description: 'A size was chosen in the card generator.',
    props: { size: 'square | story | preview' },
    emitted: ['src/components/CardGenerator.tsx'],
  },
  {
    name: 'card_image_downloaded',
    description: 'The card generator picture was downloaded (the button, or the fallback of a failed share).',
    props: { size: 'square | story | preview', measure: 'nonVoters | margin | turnout' },
    emitted: ['src/components/CardGenerator.tsx'],
  },
  {
    name: 'card_svg_downloaded',
    description: 'The self-describing SVG of the card generator picture was downloaded (text kept as text, with title and description).',
    props: { size: 'square | story | preview', measure: 'nonVoters | margin | turnout' },
    emitted: ['src/components/CardGenerator.tsx'],
  },
  {
    name: 'qr_screen_shown',
    description: 'The Mostrar QR screen (/:uf/:slug/qr/ or the demo /qr/) was shown.',
    props: {},
    emitted: ['src/scripts/qr-analytics.ts'],
  },
  {
    name: 'poster_printed',
    description: 'The visitor printed the page (the print layer IS the poster); screen emits once per print.',
    props: {},
    emitted: ['src/scripts/qr-analytics.ts'],
  },
]

export const EVENT_NAMES: ReadonlySet<string> = new Set(EVENTS.map((e) => e.name))

export function eventDoc(name: string): EventDoc | undefined {
  return EVENTS.find((e) => e.name === name)
}

/** The properties a given event may send (everything else is dropped by the GA4 provider). */
export function eventProps(name: string): ReadonlySet<string> {
  return new Set(Object.keys(EVENTS.find((e) => e.name === name)?.props ?? {}))
}