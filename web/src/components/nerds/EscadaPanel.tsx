import { useEffect, useMemo, useState } from 'react'
import { ficha, printedRow, QUESTIONS, SEM_2, sortFicha, type BarSpec, type SortDir } from '@/lib/nerds/escada'

/**
 * The Escada island (#75). Server-rendered (and with scripts off, or on a phone) it is the FICHA: the cycles x measures table. On a desktop, when scrolled into view
 * (client:panel = client:media("(min-width: 1024px)") + client:visible), it upgrades IN PLACE to the chart: cycles as rows, the 1º and 2º turno as paired horizontal bars from 0%,
 * every value printed at the end of its bar, the legend naming both turnos, and the national figure as a printed reference line on região and estado. The measure picker
 * reads its options from the panel record and keeps the choice in the address (`medida=`). `data-drawn` says what is on screen, for tests to wait on.
 */
interface Props {
  spec: BarSpec
  /** id of the panel's h2, which follows the measure. */
  titleId: string
}

const W = 640
const X0 = 72
const X1 = 548
const BAR = 22
const GAP = 4
const GROUP = 22
const TOP = 36
const x = (percent: number) => X0 + ((X1 - X0) * percent) / 100

export default function EscadaPanel({ spec, titleId }: Props) {
  const [enhanced, setEnhanced] = useState(false)
  const [view, setView] = useState<'ficha' | 'chart'>('ficha')
  const [measure, setMeasure] = useState(spec.measure)
  const [sort, setSort] = useState<{ column: number; dir: SortDir } | null>(null)

  useEffect(() => {
    const wanted = new URLSearchParams(location.search).get('medida')
    if (wanted && spec.options.some((o) => o.id === wanted)) setMeasure(wanted)
    setEnhanced(true)
    setView('chart')
  }, [spec])

  const choose = (id: string) => {
    setMeasure(id)
    const q = new URLSearchParams(location.search)
    q.set('medida', id)
    try {
      history.replaceState(null, '', `?${q.toString()}`)
    } catch {
      /* the address stays as it is */
    }
  }

  useEffect(() => {
    const h2 = document.getElementById(titleId)
    if (h2 && enhanced) h2.textContent = QUESTIONS[measure] ?? h2.textContent
  }, [measure, enhanced, titleId])

  const table = useMemo(() => {
    const base = ficha(spec)
    return sort ? sortFicha(base, sort.column, sort.dir) : base
  }, [spec, sort])

  const label = spec.options.find((o) => o.id === measure)?.label ?? measure
  const height = TOP + spec.rows.length * (BAR * 2 + GAP + GROUP) + 28
  const reference = spec.reference?.byMeasure[measure]

  return (
    <div className="nerds-escada" data-escada data-view={view} data-measure={measure} data-drawn={view === 'chart' ? 'chart' : 'ficha'}>
      {enhanced && (
        <div className="nerds-picker" role="group" aria-label="Medida" data-picker>
          {spec.options.map((o) => (
            <button key={o.id} type="button" aria-pressed={o.id === measure} data-measure-option={o.id} onClick={() => choose(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      )}
      {view === 'chart' ? (
        <div data-chart>
          <ul className="nerds-legend" aria-label="Legenda">
            <li><span className="nerds-key nerds-key--1" aria-hidden="true" />1º turno</li>
            <li><span className="nerds-key nerds-key--2" aria-hidden="true" />2º turno</li>
          </ul>
          <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`${label} por ciclo e turno, barras a partir de 0%`} className="nerds-bars">
            {[0, 50, 100].map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={TOP - 8} y2={height - 22} className="nerds-grid" />
                <text x={x(t)} y={height - 8} textAnchor="middle" className="nerds-axis">{t}%</text>
              </g>
            ))}
            {spec.rows.map((row, i) => {
              const y0 = TOP + i * (BAR * 2 + GAP + GROUP)
              const pair = row.cells[measure] ?? [null, null]
              return (
                <g key={row.ciclo} data-ciclo={row.ciclo}>
                  <text x={X0 - 10} y={y0 + BAR + GAP / 2 + 5} textAnchor="end" className="nerds-cycle-label">{row.ciclo}</text>
                  {pair.map((rate, t) => {
                    const y = y0 + t * (BAR + GAP)
                    return rate ? (
                      <g key={t} data-bar={`${row.ciclo}-${t + 1}`}>
                        <rect x={X0} y={y} width={Math.max(1, x(rate.value) - X0)} height={BAR} className={`nerds-bar nerds-bar--${t + 1}`}>
                          <title>{`${row.ciclo}, ${t + 1}º turno: ${rate.text} (${rate.sub})`}</title>
                        </rect>
                        <text x={x(rate.value) + 6} y={y + BAR / 2 + 5} className={`nerds-value nerds-value--${t + 1}`}>{rate.text}</text>
                      </g>
                    ) : (
                      <text key={t} x={X0 + 6} y={y + BAR / 2 + 5} className="nerds-axis" data-bar={`${row.ciclo}-${t + 1}`}>{SEM_2}</text>
                    )
                  })}
                </g>
              )
            })}
            {reference && (
              <g data-reference>
                <line x1={x(reference.value)} x2={x(reference.value)} y1={TOP - 8} y2={height - 22} className="nerds-ref" />
                <text x={X1} y={14} textAnchor="end" className="nerds-axis">{`Linha: ${spec.reference!.label}, ${reference.text}`}</text>
              </g>
            )}
          </svg>
          <p>
            <button type="button" className="nerds-link" data-to-ficha onClick={() => setView('ficha')}>Ver como tabela (Ficha) ›</button>
          </p>
          <p className="nerds-chartnote">As barras começam em 0%. Cada ciclo mostra os dois turnos lado a lado, sem ordenar nem comparar lugares.</p>
        </div>
      ) : (
        <div data-ficha>
          {enhanced && (
            <p>
              <button type="button" className="nerds-link" data-to-chart onClick={() => setView('chart')}>Ver como gráfico ›</button>
            </p>
          )}
          <div className="nerds-tablewrap" tabIndex={0} role="region" aria-label="Ficha: ciclos e medidas">
            <table className="nerds-table" data-ficha-table>
              <caption>Ficha: uma linha por ciclo; cada medida nos dois turnos</caption>
              <thead>
                <tr>
                  {table.columns.map((c, j) => (
                    <th key={c.key} scope="col" className={j ? 'is-num' : undefined} aria-sort={sort?.column === j ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {enhanced ? (
                        <button type="button" className="nerds-sort" data-sort={j} onClick={() => setSort(sort?.column === j && sort.dir === 'asc' ? { column: j, dir: 'desc' } : { column: j, dir: 'asc' })}>
                          {c.label}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => {
                  const cells = printedRow(table, i)
                  return (
                    <tr key={row.ciclo} data-row={row.ciclo}>
                      <th scope="row">{cells[0]}</th>
                      {cells.slice(1).map((cell, j) => (
                        <td key={j} className="is-num" data-col={table.columns[j + 1]!.key}>
                          {row.cells[j] ? cell : <span className="nerds-none">{cell}</span>}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {spec.reference && (
            <p className="nerds-chartnote" data-reference-note>
              {`Referência: ${spec.reference.label}: ${Object.entries(spec.reference.byMeasure).map(([id, r]) => `${spec.options.find((o) => o.id === id)?.label ?? id} ${r.text}`).join(' · ')}.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
