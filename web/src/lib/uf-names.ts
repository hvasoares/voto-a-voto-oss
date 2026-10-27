/**
 * Official names of the 27 federative units (IBGE open data), for the page titles and sentences of
 * the municipality-map pages `/mapa/<uf>/` (ticket #17). Geography, not election data: the same
 * short official wording in Portuguese, in IBGE area-code order. The dataset itself carries only
 * the UF codes; no election figure is hard-coded here.
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
}