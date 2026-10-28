import { assertCatalog, type PanelRecord } from './panels'

/** The panels of the dashboard, in page order. Each later ticket appends its records here; the gates run on the whole list when a page is built. */
export const PLACAR: PanelRecord = {
  id: 'placar',
  level: 'todos',
  shard: 'nivel',
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

export const CATALOG: readonly PanelRecord[] = [PLACAR]

assertCatalog(CATALOG)
