import type { StripSpec, TableSpec } from './panels'
import type { Signals } from './signals'

export const sinaisStrip = (s: Signals): StripSpec => ({
  kind: 'stat',
  strip: [
    { key: 'cobertura', label: 'Cobertura', value: s.coverage.value, note: s.coverage.note },
    { key: 'conferencia', label: 'Conferência', value: s.conference.value, note: s.conference.note, ok: s.conference.ok },
    { key: 'edicao', label: 'Edição', value: s.edition.value, note: s.edition.note },
  ],
})

export const STATUS = { pass: '✓ Passou', fail: 'Falhou', unchecked: 'Não conferido' } as const

/** The rules with their pass or failure for the edition (a failure lists what was found); rows are the rules in a fixed order. */
export function invariantesTable(s: Signals): TableSpec {
  return {
    kind: 'table',
    caption: 'Conferências desta edição',
    columns: [
      { key: 'situacao', label: 'Situação', numeric: false },
      { key: 'regra', label: 'Regra', numeric: false },
      { key: 'detalhe', label: 'Detalhe', numeric: false },
    ],
    rows: s.rules.map((r) => ({
      id: r.id,
      cells: [
        r.ok === true ? STATUS.pass : r.ok === false ? STATUS.fail : STATUS.unchecked,
        r.label,
        r.ok === false ? `${r.failures.length} ${r.failures.length === 1 ? 'caso' : 'casos'}: ${r.failures.slice(0, 3).map((f) => `${f.ano}, ${f.turno}º turno, ${f.message}`).join(' | ')}` : r.detail,
      ],
    })),
  }
}
