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
  measure: { family: 'participacao', id: 'comparecimento', options: ['comparecimento', 'abstencao', 'brancos_nulos', 'validos'] },
  series: 'turno',
  title: 'Como o comparecimento mudou de um ciclo para o outro?',
  footer: {
    definicao: 'A medida escolhida, por ciclo e turno, no total do lugar mostrado.',
    fonte: 'TSE, {edicao}, resultados finais de 2018, 2022 e 2026.',
    calculo: 'Comparecimento e abstenção = votantes e não votantes ÷ eleitorado; brancos + nulos e votos válidos = parte do comparecimento. As barras começam em 0%.',
    naoMede: 'O motivo de não votar nem a mudança de opinião de ninguém.',
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

export const CATALOG: readonly PanelRecord[] = [PLACAR, ESCADA, DETALHE]

assertCatalog(CATALOG)
