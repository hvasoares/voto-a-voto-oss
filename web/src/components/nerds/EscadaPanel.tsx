import { useEffect, useMemo, useState } from 'react'
import { useIslandReady } from '@/components/use-island-ready'
import { candidatosFicha, CANDIDATOS, ficha, printedRow, QUESTIONS, SEM_2, sortFicha, type BarSpec, type SortDir } from '@/lib/nerds/escada'
import { GROUP_PARTICIPACAO } from '@/lib/nerds/rates'

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
  const [turno, setTurno] = useState<1 | 2>(1)
  const [sort, setSort] = useState<{ column: number; dir: SortDir } | null>(null)
  // data-ready (#122): yes once the island has run (the spec is a prop, so the upgrade to the chart is its data).
  const island = useIslandReady('escada-panel')

  useEffect(() => {
    const wanted = new URLSearchParams(location.search).get('medida')
    if (wanted && spec.options.some((o) => o.id === wanted)) setMeasure(wanted)
    if (new URLSearchParams(location.search).get('turno') === '2') setTurno(2)
    setEnhanced(true)
    setView('chart')
    island.markReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="nerds-escada" data-escada data-view={view} data-measure={measure} data-turno={turno} data-drawn={view === 'chart' ? 'chart' : 'ficha'} data-ready={island.dataReady}>
      {enhanced && (
        <div className="nerds-map-controls" data-picker>
          {[...new Set(spec.options.map((o) => o.group))].map((group) => (
            <div key={group} className="nerds-picker" role="group" aria-label={group}>
              {spec.options.filter((o) => o.group === group).map((o) => (
                <button key={o.id} type="button" aria-pressed={o.id === measure} data-measure-option={o.id} onClick={() => choose(o.id)}>{o.label}</button>
              ))}
            </div>
          ))}
          {measure === CANDIDATOS && (
            <div className="nerds-picker" role="group" aria-label="Turno" data-picker-turno>
              {([1, 2] as const).map((t) => (
                <button key={t} type="button" aria-pressed={t === turno} data-turno-option={t} onClick={() => setTurno(t)}>{t}º turno</button>
              ))}
            </div>
          )}
        </div>
      )}
      {view === 'chart' && measure === CANDIDATOS && spec.candidatos ? (
        <div data-chart data-candidatos>
          <p className="nerds-chartnote">{`Parcela dos votos válidos de cada candidato, ${turno}º turno, na ordem do número na urna.`}</p>
          <CandidatesChart cycles={spec.candidatos[turno]} turno={turno} />
          <p><button type="button" className="nerds-link" data-to-ficha onClick={() => setView('ficha')}>Ver como tabela (Ficha) ›</button></p>
          <p className="nerds-chartnote">As barras começam em 0%; os votos de cada candidato estão na Ficha. Os candidatos aparecem na ordem do número, sem ordenar por resultado.</p>
        </div>
      ) : view === 'chart' ? (
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
          {spec.candidatos && ([1, 2] as const).map((t) => {
            const f = candidatosFicha(spec, t)
            return f.rows.length ? (
              <section key={t} className="nerds-dist__turno" data-cand-table={t}>
                <h3>{`Votos por candidato, ${t}º turno`}</h3>
                <div className="nerds-tablewrap" tabIndex={0} role="region" aria-label={`Votos por candidato, ${t}º turno`}>
                  <table className="nerds-table" data-cand-ficha>
                    <thead><tr>{f.headers.map((h, i) => <th key={h} scope="col" className={i > 2 ? 'is-num' : undefined}>{h}</th>)}</tr></thead>
                    <tbody>{f.rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j} className={j > 2 ? 'is-num' : undefined}>{c}</td>))}</tr>)}</tbody>
                  </table>
                </div>
              </section>
            ) : null
          })}
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

function CandidatesChart({ cycles, turno }: { cycles: NonNullable<BarSpec['candidatos']>[1]; turno: 1 | 2 }) {
  const rows = cycles.reduce((n, c) => n + c.bars.length, 0)
  const height = TOP + rows * (BAR + GAP) + cycles.length * GROUP + 28
  let y = TOP
  return (
    <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label="Parcela dos votos válidos de cada candidato, barras a partir de 0%" className="nerds-bars" data-cand-chart>
      {[0, 50, 100].map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={TOP - 8} y2={height - 22} className="nerds-grid" />
          <text x={x(t)} y={height - 8} textAnchor="middle" className="nerds-axis">{t}%</text>
        </g>
      ))}
      {cycles.map((c) => {
        const top = y
        const group = c.bars.map((b, i) => {
          const by = y + i * (BAR + GAP)
          // Two candidates (a 2º turno): the first (lower ballot number) and the second take the two colours of "Brasil e regiões"; a 1º turno has many, all neutral and named.
          const tone = turno === 2 && c.bars.length === 2 ? (i === 0 ? 'nerds-cand-a' : 'nerds-cand-b') : 'nerds-cand-n'
          return (
            <g key={b.numero} data-cand-bar={`${c.ciclo}-${b.numero}`}>
              <rect x={X0} y={by} width={Math.max(1, x(b.share) - X0)} height={BAR} className={`nerds-bar ${tone}`}><title>{`${c.ciclo}, nº ${b.numero} ${b.nome} (${b.partido}): ${b.text} dos votos válidos (${b.votos} votos)`}</title></rect>
              <text x={x(b.share) + 6} y={by + BAR / 2 + 5} className="nerds-value">{`${b.nome} · ${b.text}`}</text>
            </g>
          )
        })
        y += c.bars.length * (BAR + GAP) + GROUP
        return (
          <g key={c.ciclo} data-ciclo={c.ciclo}>
            <text x={X0 - 10} y={top + 14} textAnchor="end" className="nerds-cycle-label">{c.ciclo}</text>
            {group}
          </g>
        )
      })}
    </svg>
  )
}
