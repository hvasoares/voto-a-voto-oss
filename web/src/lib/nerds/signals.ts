import { checkPlace, OWN_RULES, type PlaceInfo, type RuleResult } from './checks'
import type { LevelShard } from './types'
import { editionLabel } from '../editions'
import type { Edition } from '../editions'

/**
 * Sinais (#77): the strip of three stats on every level, leading with what is wrong. Coverage: the dataset does not carry sections counted against expected, so the strip says
 * how many places have a published result instead; Conferência: the reconciliation delta (expected 0) and how many checks passed; Edição: its date and whether it is the latest.
 * A failing check (or a place with no result) turns the strip into a banner that leads the page, and the cycles it touches are labelled "não conferido".
 */
export interface Signals {
  rules: RuleResult[]
  failed: RuleResult[]
  /** Cycles with at least one failure: their panels read "não conferido". */
  uncheckedCycles: number[]
  coverage: { value: string; note: string }
  conference: { value: string; note: string; ok: boolean }
  edition: { value: string; note: string }
  banner?: string
}

export function buildSignals(
  shards: ReadonlyMap<string, LevelShard>,
  brasil: ReadonlyMap<string, LevelShard> | undefined,
  place: PlaceInfo,
  edition: Pick<Edition, 'id' | 'date'>,
  latest: boolean,
): Signals {
  const rules = checkPlace(shards, brasil, place, OWN_RULES(place.level))
  const failed = rules.filter((r) => r.ok === false)
  const uncheckedCycles = [...new Set(failed.flatMap((r) => r.failures.map((f) => f.ano)))].sort((a, b) => a - b)
  const passed = rules.filter((r) => r.ok === true).length
  const evaluated = rules.filter((r) => r.ok !== null).length
  const first = [...shards.values()].find((s) => s.ano === Math.max(...[...shards.values()].map((x) => x.ano)))!
  const children = first.children.municipios ?? first.children.ufs ?? first.children.regioes ?? []
  const delta = failed.filter((r) => r.id === 'soma-filhos' || r.id === 'parte-do-brasil').reduce((t, r) => t + r.failures.length, 0)
  return {
    rules,
    failed,
    uncheckedCycles,
    coverage: {
      value: `${children.length} ${first.children.municipios ? 'municípios' : first.children.regioes ? 'regiões' : 'estados'} com resultado final`,
      note: 'As seções apuradas não constam nos dados publicados.',
    },
    conference: {
      value: failed.length ? `${failed.length} ${failed.length === 1 ? 'conferência falhou' : 'conferências falharam'}` : 'Os números fecham',
      note: `Diferença: ${delta} · ${passed} de ${evaluated} conferências passaram`,
      ok: failed.length === 0,
    },
    edition: { value: `${editionLabel(edition)} · ${latest ? 'é a mais recente' : 'não é a mais recente'}`, note: `Conferido em ${editionLabel(edition)}` },
    banner: failed.length ? `${failed.length === 1 ? 'Uma conferência falhou' : `${failed.length} conferências falharam`} nesta edição: ${failed.map((r) => r.label).join('; ')}. Os painéis afetados dizem “não conferido”.` : undefined,
  }
}

export const NAO_CONFERIDO = 'não conferido'
