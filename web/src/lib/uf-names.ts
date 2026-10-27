/**
 * Official names of the 27 federative units (IBGE open data), for the municipality-map pages
 * `/mapa/<uf>/` (ticket #17) and for the screen-reader labels (ticket #19: the state tile anchors
 * and the map's shapes label themselves "RJ · Rio de Janeiro", never the bare code alone).
 * Geography, not election data: the same short official wording in Portuguese, in IBGE
 * area-code order. The dataset itself carries only the UF codes; no election figure is
 * hard-coded here. The overseas post (`zz`) is "Exterior", like `ufLabel` renders it.
 */
export const UF_NOME: Record<string, string> = {
  ro: 'Rondônia',
  ac: 'Acre',
  am: 'Amazonas',
  rr: 'Roraima',
  pa: 'Pará',
  ap: 'Amapá',
  to: 'Tocantins',
  ma: 'Maranhão',
  pi: 'Piauí',
  ce: 'Ceará',
  rn: 'Rio Grande do Norte',
  pb: 'Paraíba',
  pe: 'Pernambuco',
  al: 'Alagoas',
  se: 'Sergipe',
  ba: 'Bahia',
  mg: 'Minas Gerais',
  es: 'Espírito Santo',
  rj: 'Rio de Janeiro',
  sp: 'São Paulo',
  pr: 'Paraná',
  sc: 'Santa Catarina',
  rs: 'Rio Grande do Sul',
  ms: 'Mato Grosso do Sul',
  mt: 'Mato Grosso',
  go: 'Goiás',
  df: 'Distrito Federal',
  zz: 'Exterior',
}

/** Screen-reader spelling (issue #19): the same map, alphabetical, with the overseas post. */
export const UF_NAMES = UF_NOME

/**
 * "RJ · Rio de Janeiro" — keeps the visible UF code in the accessible name (label-in-name) and
 * adds the full state; the overlay state the dataset has is "Exterior". Unknown codes fall back
 * to the upper-case code alone.
 */
export function ufFullLabel(uf: string): string {
  const upper = uf.toUpperCase()
  const name = UF_NOME[uf.toLowerCase()]
  return name ? `${upper} · ${name}` : upper
}