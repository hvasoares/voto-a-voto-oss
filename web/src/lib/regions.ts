/**
 * The five regions of Brazil, light enough for the browser (#183): the keys in display order (north to south, as the Brasil e regiões page lists them)
 * and their names. `region-map.ts` (the outlines, build time) and `brasil.ts` (the numbers) read them from here, so no module keeps a second list.
 */
export const REGION_ORDER = ['norte', 'nordeste', 'centro-oeste', 'sudeste', 'sul'] as const
export type RegionKey = (typeof REGION_ORDER)[number]

/** The names of the five regions, fixed pt-BR geography (not election numbers). */
export const REGION_NOME: Record<RegionKey, string> = {
  norte: 'Norte',
  nordeste: 'Nordeste',
  'centro-oeste': 'Centro-Oeste',
  sudeste: 'Sudeste',
  sul: 'Sul',
}

export const isRegionKey = (key: string): key is RegionKey => (REGION_ORDER as readonly string[]).includes(key)

/** The name of a region key; any other key (the overseas posts) is returned as it is. */
export const regionName = (key: string): string => (isRegionKey(key) ? REGION_NOME[key] : key)
