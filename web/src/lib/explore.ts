/**
 * The destinations of the Home's task block (#99; they were the "Para explorar" rows). `:uf` is filled with a state the dataset has.
 * `task` says which entry of the block shows the row: "entender" sits under "Entender o país e os estados";
 * "meu-brasil" stays a row of its own until the Comparar chooser (#101) takes it.
 */
export const EXPLORE = [
  { task: 'entender', title: 'Brasil e regiões', sub: 'Resultado nacional e por região, 2º turno', to: '/brasil/' },
  { task: 'entender', title: 'Mapa por estado', sub: 'Margem e virada em cada estado', to: '/mapa/' },
  { task: 'entender', title: 'Relatórios', sub: 'Viradas, comparações e disputas apertadas', to: '/relatorios/' },
  { task: 'entender', title: 'Três ciclos por estado', sub: '2018, 2022 e 2026 lado a lado', to: '/tres-ciclos/:uf/' },
  { task: 'meu-brasil', title: 'Meu Brasil', sub: 'Onde você mora, vota e nasceu, em três ciclos', to: '/meu-brasil/' },
] as const
