/**
 * Full name of each federative unit (issue #19's screen-reader pass): the UF tile anchors and the
 * map's shapes label themselves "RJ · Rio de Janeiro", never the bare code alone. Names are the
 * IBGE's usual spellings; the overseas post (`zz`) is "Exterior", like `ufLabel` renders it.
 */
export const UF_NAMES: Record<string, string> = {
  ac: 'Acre',
  al: 'Alagoas',
  am: 'Amazonas',
  ap: 'Amapá',
  ba: 'Bahia',
  ce: 'Ceará',
  df: 'Distrito Federal',
  es: 'Espírito Santo',
  go: 'Goiás',
  ma: 'Maranhão',
  mg: 'Minas Gerais',
  ms: 'Mato Grosso do Sul',
  mt: 'Mato Grosso',
  pa: 'Pará',
  pb: 'Paraíba',
  pe: 'Pernambuco',
  pi: 'Piauí',
  pr: 'Paraná',
  rj: 'Rio de Janeiro',
  rn: 'Rio Grande do Norte',
  ro: 'Rondônia',
  rr: 'Roraima',
  rs: 'Rio Grande do Sul',
  sc: 'Santa Catarina',
  se: 'Sergipe',
  sp: 'São Paulo',
  to: 'Tocantins',
  zz: 'Exterior',
}

/**
 * "RJ · Rio de Janeiro" — keeps the visible UF code in the accessible name (label-in-name) and
 * adds the full state; the overlay state the dataset has is "Exterior". Unknown codes fall back
 * to the upper-case code alone.
 */
export function ufFullLabel(uf: string): string {
  const upper = uf.toUpperCase()
  const name = UF_NAMES[uf.toLowerCase()]
  return name ? `${upper} · ${name}` : upper
}