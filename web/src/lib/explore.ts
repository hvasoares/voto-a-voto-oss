/**
 * The destinations of the Home's task block (#99; they were the "Para explorar" rows). `:uf` is filled with a state the dataset has.
 * `task` says which entry of the block shows the row: "entender" sits under "Entender o país e os estados";
 * "comparar" rows are the chooser's options (#101); `destination` marks the ones that need a city (see destinations.ts).
 */
export const EXPLORE = [
  { task: 'entender', title: 'Brasil e regiões', sub: 'Resultado nacional e por região, 2º turno', to: '/brasil/' },
  { task: 'entender', title: 'Mapa por estado', sub: 'Margem e virada em cada estado', to: '/mapa/' },
  { task: 'entender', title: 'Relatórios', sub: 'Viradas, comparações e disputas apertadas', to: '/relatorios/' },
  { task: 'entender', title: 'Três ciclos por estado', sub: '2018, 2022 e 2026 lado a lado', to: '/tres-ciclos/:uf/' },
] as const

/** The "Comparar" chooser (#101): what to compare -> an existing route. `destination`: the option needs a city, so it asks through the search. */
export const COMPARAR = [
  { title: 'Minha cidade em 2018, 2022 e 2026', sub: 'Escolha a cidade e veja os três ciclos', destination: 'tres-ciclos' },
  { title: 'Duas cidades lado a lado', sub: 'Escolha a primeira cidade; a outra vem depois', destination: 'cara-a-cara' },
  { title: 'Dois estados ou duas regiões', sub: 'Lado a lado, no Cara a cara', to: '/cara-a-cara/?nivel=estado' },
  { title: 'Meus lugares ao longo do tempo', sub: 'Até três lugares, em três ciclos', to: '/meu-brasil/' },
  { title: 'O mesmo estado nos três ciclos', sub: '2018, 2022 e 2026 lado a lado', to: '/tres-ciclos/:uf/' },
] as const
