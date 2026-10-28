import { assertCatalog, type PanelRecord } from './panels'

/** The panels of the dashboard, in page order. Each later ticket appends its records here; the gates run on the whole list when a page is built. */
export const PLACAR: PanelRecord = {
  id: 'placar',
  level: 'todos',
  shard: 'ciclo',
  transform: 'placar',
  kind: 'stat',
  measure: { family: 'participacao', id: 'comparecimento' },
  series: 'turno',
  title: 'Quantos eleitores podiam votar, e quantos votaram?',
  footer: {
    definicao: 'Eleitores aptos e comparecimento por turno, no total do lugar mostrado.',
    fonte: 'TSE, {edicao}, resultado final.',
    calculo: 'Comparecimento = votantes ÷ eleitorado. Abstenção = não votantes ÷ eleitorado. Brancos + nulos e votos válidos são partes do comparecimento (inclui anulados e apurados em separado).',
    naoMede: 'O motivo de não votar nem o perfil de quem votou.',
  },
}

export const ESCADA: PanelRecord = {
  id: 'escada',
  level: 'todos',
  shard: 'ciclos',
  transform: 'escada',
  kind: 'bar',
  measure: { family: 'participacao', id: 'comparecimento', options: ['comparecimento', 'abstencao', 'brancos_nulos', 'validos'], candidatos: true },
  series: 'turno',
  title: 'Como o comparecimento mudou de um ciclo para o outro?',
  footer: {
    definicao: 'A medida escolhida, por ciclo e turno, no total do lugar mostrado.',
    fonte: 'TSE, {edicao}, resultados finais de 2018, 2022 e 2026.',
    calculo: 'Comparecimento e abstenção = votantes e não votantes ÷ eleitorado; brancos + nulos e votos válidos = parte do comparecimento; candidato = votos do candidato ÷ votos válidos, na ordem do número na urna. As barras começam em 0%.',
    naoMede: 'O motivo de não votar nem a mudança de opinião de ninguém; não ordena nem compara candidatos.',
  },
}

export const DETALHE: PanelRecord = {
  id: 'detalhe',
  level: 'todos',
  shard: 'ciclo',
  transform: 'detalhe',
  kind: 'table',
  measure: { family: 'participacao', id: 'comparecimento' },
  series: 'turno',
  title: 'Quais são os números de cada {filhos}?',
  footer: {
    definicao: 'Uma linha por lugar do nível abaixo, em ordem alfabética; a última linha é o total do lugar mostrado.',
    fonte: 'TSE, {edicao}, resultado final.',
    calculo: 'Eleitorado em pessoas; comparecimento e abstenção = votantes e não votantes ÷ eleitorado; brancos + nulos = parte do comparecimento. O total é a soma das linhas.',
    naoMede: 'Motivo, perfil de eleitor nem ranking entre lugares.',
  },
}

export const SINAIS: PanelRecord = {
  id: 'sinais',
  level: 'todos',
  shard: 'ciclos',
  transform: 'sinais',
  kind: 'stat',
  measure: { family: 'participacao', id: 'comparecimento' },
  series: 'turno',
  title: 'Estes números fecham?',
  footer: {
    definicao: 'Três sinais da edição: a cobertura dos dados, a conferência dos números e a edição mostrada.',
    fonte: 'TSE, {edicao}; conferências do voto-a-voto.',
    calculo: 'A conferência roda as regras da lista de conferências sobre os dados deste lugar; a diferença esperada é 0.',
    naoMede: 'Se o resultado oficial está correto; só se os números fecham entre si.',
  },
}

export const INVARIANTES: PanelRecord = {
  id: 'invariantes',
  level: 'todos',
  shard: 'ciclos',
  transform: 'invariantes',
  kind: 'table',
  measure: { family: 'participacao', id: 'comparecimento' },
  series: 'turno',
  title: 'Que conferências estes números passaram?',
  footer: {
    definicao: 'Regras que todo número publicado precisa cumprir.',
    fonte: 'TSE, {edicao}; regras do voto-a-voto.',
    calculo: 'Cada regra é uma soma ou um limite sobre as linhas desta página.',
    naoMede: 'Se o resultado oficial está correto; só se os números fecham entre si.',
  },
}

export const MAPA: PanelRecord = {
  id: 'mapa',
  level: 'todos',
  shard: 'ciclos',
  transform: 'mapa',
  kind: 'map',
  measure: { family: 'participacao', id: 'comparecimento', options: ['comparecimento', 'abstencao', 'brancos_nulos', 'validos'], candidatos: true },
  series: 'turno',
  title: 'Como a medida escolhida se distribui pelos estados?',
  footer: {
    definicao: 'A medida escolhida em cada estado, no turno escolhido; cinco faixas de cor, com a faixa e o valor escritos.',
    fonte: 'TSE, {edicao}; contornos do IBGE.',
    calculo: 'Comparecimento e abstenção = votantes e não votantes ÷ eleitorado; brancos + nulos e votos válidos = parte do comparecimento; candidato = votos do candidato ÷ votos válidos. As faixas dividem os valores mostrados em cinco passos iguais.',
    naoMede: 'Motivo, perfil de eleitor nem ranking entre lugares; a cor não ordena.',
  },
}

export const PAR_RECORD: PanelRecord = {
  id: 'par',
  level: 'todos',
  shard: 'ciclo',
  transform: 'par',
  kind: 'table',
  measure: { family: 'participacao', id: 'comparecimento' },
  series: 'turno',
  title: 'Quanto votou, turno a turno?',
  footer: {
    definicao: 'O comparecimento do lugar e das linhas de referência, por turno.',
    fonte: 'TSE, {edicao}.',
    calculo: 'Votantes ÷ eleitorado, em cada turno.',
    naoMede: 'Motivo nem perfil de eleitor; nenhuma diferença entre os turnos é calculada.',
  },
}

export const DISTRIBUICAO: PanelRecord = {
  id: 'distribuicao',
  level: 'todos',
  shard: 'ciclo',
  transform: 'distribuicao',
  kind: 'histogram',
  measure: { family: 'participacao', id: 'comparecimento', options: ['comparecimento', 'abstencao', 'brancos_nulos', 'validos'], candidatos: true },
  series: 'turno',
  title: 'Como os {filhos_plural} se distribuem?',
  footer: {
    definicao: 'A medida escolhida em cada lugar do nível abaixo, contada em faixas de 2 pontos.',
    fonte: 'TSE, {edicao}.',
    calculo: 'Faixas fixas de 2 pontos; quartis por interpolação entre os valores ordenados; atípico além de 1,5 × a amplitude interquartil; candidato = votos do candidato ÷ votos válidos.',
    naoMede: 'Motivo nem perfil; não classifica nem nomeia lugares.',
  },
}

export const CATALOG: readonly PanelRecord[] = [SINAIS, PLACAR, MAPA, ESCADA, PAR_RECORD, DISTRIBUICAO, DETALHE, INVARIANTES]

assertCatalog(CATALOG)
