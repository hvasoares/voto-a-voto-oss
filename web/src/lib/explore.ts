/** "Para explorar" entries of the home frame. `:uf` is filled with a state the dataset has (the vanilla home used the first one). */
export const EXPLORE = [
  { title: 'Brasil e regiões', sub: 'Resultado nacional e por região, 2º turno', to: '/brasil/' },
  { title: 'Mapa por estado', sub: 'Margem e virada em cada estado', to: '/mapa/' },
  { title: 'Relatórios', sub: 'Viradas, comparações e disputas apertadas', to: '/relatorios/' },
  { title: 'Três ciclos por estado', sub: '2018, 2022 e 2026 lado a lado', to: '/tres-ciclos/:uf/' },
  { title: 'Meu Brasil', sub: 'Onde você mora, vota e nasceu, em três ciclos', to: '/meu-brasil/' },
] as const
