import { useEffect, useState } from 'react'
import { printedFive, type DistribuicaoSpec } from '@/lib/nerds/distribuicao'

/**
 * The Distribuição island (#79). Server-rendered (scripts off, or a phone) it is a table of the two-point bins and the five-number summary for each turno; from 1024 px, in view
 * (client:panel), it becomes the histogram with the box plot, with pickers for the measure and the turno. The panel names no place and lists no outlier. `data-drawn` says what is
 * on screen ("tabela" or "grafico"), for tests to wait on.
 */
interface Props {
  spec: DistribuicaoSpec
  titleId: string
}
const W = 648
const H_HIST = 150
const X0 = 8
const X1 = W - 8

export default function DistribuicaoPanel({ spec, titleId }: Props) {
  const [enhanced, setEnhanced] = useState(false)
  const [view, setView] = useState<'tabela' | 'grafico'>('tabela')
  const [measure, setMeasure] = useState(spec.initial.measure)
  const [turno, setTurno] = useState<1 | 2>(spec.initial.turno)
  void titleId
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const m = q.get('medida')
    if (m && spec.options.some((o) => o.id === m)) setMeasure(m)
    if (q.get('turno') === '2' && spec.turnos.includes(2)) setTurno(2)
    setEnhanced(true)
    setView('grafico')
  }, [spec])
  const remember = (m: string, t: number) => {
    const q = new URLSearchParams(location.search)
    q.set('medida', m)
    q.set('turno', String(t))
    try {
      history.replaceState(null, '', `?${q.toString()}`)
    } catch {
      /* the address stays as it is */
    }
  }
  const label = spec.options.find((o) => o.id === measure)?.label ?? measure
  const dist = spec.byKey[`${turno}-${measure}`]

  return (
    <div className="nerds-dist" data-dist data-drawn={view} data-measure={measure} data-turno={turno}>
      {enhanced && (
        <div className="nerds-map-controls">
          <div className="nerds-picker" role="group" aria-label="Medida" data-picker-measure>
            {spec.options.map((o) => (
              <button key={o.id} type="button" aria-pressed={o.id === measure} data-measure-option={o.id} onClick={() => { setMeasure(o.id); remember(o.id, turno) }}>{o.label}</button>
            ))}
          </div>
          <div className="nerds-picker" role="group" aria-label="Turno" data-picker-turno>
            {spec.turnos.map((t) => (
              <button key={t} type="button" aria-pressed={t === turno} data-turno-option={t} onClick={() => { setTurno(t); remember(measure, t) }}>{t}º turno</button>
            ))}
          </div>
        </div>
      )}
      {view === 'grafico' && dist ? (
        <div data-chart>
          <p className="nerds-chartnote">{`${spec.unit === 'UFs' ? 'UFs' : 'Municípios'} por faixa de ${label.toLowerCase()} (%), ${turno}º turno de ${spec.ano}; ${dist.n} no total`}</p>
          <Chart dist={dist} />
          <ul className="nerds-five" data-five aria-label="Resumo de cinco números">
            {printedFive(dist.five).map((f) => <li key={f.label}>{f.label} <b>{f.text}</b></li>)}
          </ul>
          <p className="nerds-chartnote" data-rule>{spec.rule}</p>
          <p><button type="button" className="nerds-link" data-to-tabela onClick={() => setView('tabela')}>Ver como tabela ›</button></p>
        </div>
      ) : (
        <div data-tabelas>
          {enhanced && <p><button type="button" className="nerds-link" data-to-grafico onClick={() => setView('grafico')}>Ver como gráfico ›</button></p>}
          {spec.turnos.map((t) => {
            const d = spec.byKey[`${t}-${measure}`]
            if (!d) return null
            return (
              <section key={t} className="nerds-dist__turno" data-turno-table={t}>
                <h3>{`${label}, ${t}º turno: ${d.n} ${spec.unit}`}</h3>
                <div className="nerds-tablewrap" tabIndex={0} role="region" aria-label={`Faixas de ${label}, ${t}º turno`}>
                  <table className="nerds-table" data-bins-table>
                    <thead><tr><th scope="col">Faixa</th><th scope="col" className="is-num">{spec.unit === 'UFs' ? 'UFs' : 'Municípios'}</th></tr></thead>
                    <tbody>
                      {d.bins.map((b) => <tr key={b.lo} data-bin={b.lo}><th scope="row">{`${b.lo}–${b.hi}%`}</th><td className="is-num" data-count>{b.count}</td></tr>)}
                    </tbody>
                  </table>
                </div>
                <ul className="nerds-five" data-five>
                  {printedFive(d.five).map((f) => <li key={f.label}>{f.label} <b>{f.text}</b></li>)}
                </ul>
              </section>
            )
          })}
          <p className="nerds-chartnote" data-rule>{spec.rule}</p>
        </div>
      )}
    </div>
  )
}

function Chart({ dist }: { dist: NonNullable<DistribuicaoSpec['byKey'][string]> }) {
  const lo = dist.bins[0]!.lo
  const hi = dist.bins.at(-1)!.hi
  const x = (v: number) => X0 + ((X1 - X0) * (v - lo)) / (hi - lo)
  const max = Math.max(...dist.bins.map((b) => b.count))
  const barW = (X1 - X0) / dist.bins.length
  const f = dist.five
  const yBox = H_HIST + 54
  return (
    <svg viewBox={`0 0 ${W} ${H_HIST + 100}`} className="nerds-hist" role="img" aria-label="Histograma em faixas de 2 pontos e diagrama de caixa">
      {dist.bins.map((b, i) => {
        const h = max ? (b.count / max) * (H_HIST - 30) : 0
        return (
          <g key={b.lo} data-bar={b.lo}>
            <rect x={X0 + i * barW + 1} y={H_HIST - h} width={barW - 2} height={Math.max(b.count ? 1 : 0, h)} className="nerds-bar nerds-bar--1" />
            <text x={X0 + i * barW + barW / 2} y={H_HIST - h - 4} textAnchor="middle" className="nerds-count-label">{b.count}</text>
            <text x={X0 + i * barW + barW / 2} y={H_HIST + 14} textAnchor="middle" className="nerds-axis">{`${b.lo}–${b.hi}`}</text>
          </g>
        )
      })}
      <line x1={X0} x2={X1} y1={H_HIST} y2={H_HIST} className="nerds-grid" />
      <g data-box>
        <line x1={x(f.min)} x2={x(f.q1)} y1={yBox} y2={yBox} className="nerds-whisker" />
        <line x1={x(f.q3)} x2={x(f.max)} y1={yBox} y2={yBox} className="nerds-whisker" />
        <rect x={x(f.q1)} y={yBox - 12} width={Math.max(1, x(f.q3) - x(f.q1))} height={24} className="nerds-box" />
        <line x1={x(f.median)} x2={x(f.median)} y1={yBox - 12} y2={yBox + 12} className="nerds-median" />
        {printedFive(f).map((p, i) => {
          const at = [f.min, f.q1, f.median, f.q3, f.max][i]!
          return <text key={p.label} x={x(at)} y={yBox + 30 + (i % 2) * 12} textAnchor="middle" className="nerds-axis">{`${p.label} ${p.text}`}</text>
        })}
      </g>
    </svg>
  )
}

