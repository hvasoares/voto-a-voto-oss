// @vitest-environment jsdom
/**
 * data-ready of the nerds panels (#122): both are `client:panel` upgrades of server-drawn ficha/tabela —
 * no on the server, yes once the island has run (the spec is a prop, so the upgrade IS its data).
 */
import { cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BarSpec } from '@/lib/nerds/escada'
import type { DistribuicaoSpec } from '@/lib/nerds/distribuicao'
import EscadaPanel from './nerds/EscadaPanel'
import DistribuicaoPanel from './nerds/DistribuicaoPanel'

const ESCADA: BarSpec = {
  kind: 'bar',
  recordId: 'teste',
  measure: 'comparecimento',
  options: [{ id: 'comparecimento', label: 'Comparecimento', group: 'Participação' }],
  rows: [
    { ciclo: 2022, cells: { comparecimento: [{ value: 78.1, text: '78,1%', sub: '1.200' }, { value: 79.0, text: '79,0%', sub: '1.100' }] } },
    { ciclo: 2026, cells: { comparecimento: [{ value: 80.1, text: '80,1%', sub: '1.000' }, { value: 81.2, text: '81,2%', sub: '900' }] } },
  ],
  weight: { files: 1, gzipBytes: 100 },
}

const DIST: DistribuicaoSpec = {
  kind: 'histogram',
  recordId: 'teste',
  unit: 'UFs',
  options: [{ id: 'comparecimento', label: 'Comparecimento', group: 'Participação' }],
  initial: { measure: 'comparecimento', turno: 2 },
  byKey: {
    '2-comparecimento': {
      n: 3,
      bins: [
        { lo: 70, hi: 72, count: 1 },
        { lo: 78, hi: 80, count: 2 },
      ],
      five: { min: 71, q1: 75, median: 78, q3: 79, max: 79.5 },
      fences: [69, 85],
    },
  },
  rule: 'Outlier: fora das cercas.',
  turnos: [2],
  ano: 2026,
}

afterEach(() => {
  cleanup()
  history.replaceState(null, '', '/nerds/')
})

describe('the nerds panel islands', () => {
  it('Escada: data-ready no on the server, yes once the island runs and the chart is drawn', async () => {
    expect(renderToStaticMarkup(<EscadaPanel spec={ESCADA} titleId="t" />)).toContain('data-ready="no"')
    render(<EscadaPanel spec={ESCADA} titleId="t" />)
    const root = document.querySelector('[data-escada]')!
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    expect(root.getAttribute('data-drawn')).toBe('chart')
    expect(root.getAttribute('data-error')).toBeNull()
  })

  it('Distribuição: data-ready no on the server, yes once the island runs and the histogram is drawn', async () => {
    expect(renderToStaticMarkup(<DistribuicaoPanel spec={DIST} titleId="t" />)).toContain('data-ready="no"')
    render(<DistribuicaoPanel spec={DIST} titleId="t" />)
    const root = document.querySelector('[data-dist]')!
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    expect(root.getAttribute('data-drawn')).toBe('grafico')
  })
})
