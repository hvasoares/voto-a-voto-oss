import { METRICS, type LevelShard, type Row } from './types'

/**
 * The invariants of the dashboard (#77): every rule is a PURE check over the shards of one place (and, where a rule crosses levels, the Brasil shards), with its pass or its failures
 * for the edition. The Invariantes panel lists them, the Sinais strip leads with what is wrong, and each footer claim that names one of these rules runs as this check in CI
 * (contracts.ts), so a published claim and an executed check cannot drift.
 */
export interface Failure {
  ano: number
  turno: 1 | 2
  /** What was found, with the numbers. */
  message: string
}

export interface RuleResult {
  id: string
  label: string
  /** "Nas linhas desta página, nos dois turnos". */
  detail: string
  /** null = the dataset does not carry what the rule needs (never a pass). */
  ok: boolean | null
  failures: Failure[]
}

export interface RuleDef {
  id: string
  label: (place: PlaceInfo) => string
  detail: string
  /** Where the full list lives: only Brasil lists the cross-level sums of the other levels. */
  run: (shard: LevelShard, ctx: Ctx) => string[] | null
}

export interface PlaceInfo {
  level: 'brasil' | 'regiao' | 'estado'
  name: string
}

export interface Ctx {
  /** The Brasil shard of the same cycle and turno (absent on Brasil itself). */
  brasil?: LevelShard
}

const sum = (rows: Row[], pick: (r: Row) => number) => rows.reduce((t, r) => t + pick(r), 0)
const rowsOf = (s: LevelShard): Row[][] => Object.values(s.children).filter((x): x is Row[] => Array.isArray(x))

/** Σ children = total, on every column and candidate, for every list of children the level has (regiões and UFs on Brasil). */
function childSums(s: LevelShard): string[] {
  const out: string[] = []
  for (const rows of rowsOf(s)) {
    for (const m of METRICS) {
      const total = sum(rows, (r) => r[m])
      if (total !== s.total[m]) out.push(`${m}: a soma das linhas é ${total} e o total é ${s.total[m]} (diferença ${total - s.total[m]})`)
    }
    s.total.votos.forEach((v, i) => {
      const total = sum(rows, (r) => r.votos[i] ?? 0)
      if (total !== v) out.push(`candidato ${s.candidatos[i]?.numero ?? i}: a soma das linhas é ${total} e o total é ${v}`)
    })
  }
  return out
}

/** The level's total is its row in the Brasil shard (a região or a UF is part of Brasil). */
function partOfBrasil(s: LevelShard, ctx: Ctx): string[] | null {
  if (s.level === 'brasil') return null
  if (!ctx.brasil) return [`não há o shard do Brasil de ${s.ano}, ${s.turno}º turno para conferir`]
  const list = s.level === 'regiao' ? ctx.brasil.children.regioes : ctx.brasil.children.ufs
  const row = list?.find((r) => r.id === s.id)
  if (!row) return [`${s.id} não está no shard do Brasil`]
  return METRICS.filter((m) => row[m] !== s.total[m]).map((m) => `${m}: ${s.total[m]} aqui e ${row[m]} no Brasil`)
}

const all = (s: LevelShard): Row[] => [s.total, ...rowsOf(s).flat()]

export const RULES: RuleDef[] = [
  { id: 'soma-filhos', label: (p) => (p.level === 'brasil' ? 'Soma das regiões e das UFs = Brasil' : p.level === 'regiao' ? `Soma das UFs = ${p.name}` : `Soma dos municípios = ${p.name}`), detail: 'Eleitorado, votantes e cada coluna, nos dois turnos', run: (s) => childSums(s) },
  { id: 'parte-do-brasil', label: (p) => `${p.name} é parte do Brasil`, detail: 'O total desta página é a sua linha no Brasil, nos dois turnos', run: (s, c) => partOfBrasil(s, c) },
  {
    id: 'comparecimento-abstencao',
    label: () => 'Comparecimento + abstenção = eleitorado (100%)',
    detail: 'Nas linhas desta página, nos dois turnos; eleitores de seções não instaladas aparecem à parte',
    run: (s) => all(s).filter((r) => r.comparecimento + r.abstencao + r.nao_instalados !== r.eleitorado).map((r) => `${r.id ?? 'total'}: ${r.comparecimento} + ${r.abstencao} + ${r.nao_instalados} ≠ ${r.eleitorado}`),
  },
  {
    id: 'validos-brancos-nulos',
    label: () => 'Votos válidos + brancos + nulos = comparecimento (100%)',
    detail: 'Nas linhas desta página, nos dois turnos; brancos + nulos inclui anulados e apurados em separado',
    run: (s) => all(s).filter((r) => r.validos + r.brancos_nulos !== r.comparecimento).map((r) => `${r.id ?? 'total'}: ${r.validos} + ${r.brancos_nulos} ≠ ${r.comparecimento}`),
  },
  {
    id: 'sem-negativos',
    label: () => 'Nenhum valor negativo ou acima de 100%',
    detail: 'Todas as colunas e percentuais',
    run: (s) => all(s).flatMap((r) => [...METRICS.filter((m) => r[m] < 0).map((m) => `${r.id ?? 'total'}: ${m} negativo`), ...(r.comparecimento > r.eleitorado || r.abstencao > r.eleitorado || r.validos > r.comparecimento ? [`${r.id ?? 'total'}: parte maior que o todo`] : [])]),
  },
  {
    id: 'candidatos-brancos-nulos',
    label: () => 'Candidatos + brancos + nulos = votantes',
    detail: 'Em cada linha, nos dois turnos',
    run: (s) => (s.candidatos.length ? all(s).filter((r) => sum([r], (x) => x.votos.reduce((a, b) => a + b, 0)) + r.brancos_nulos !== r.comparecimento).map((r) => `${r.id ?? 'total'}: candidatos + brancos + nulos ≠ votantes`) : null),
  },
  { id: 'secoes', label: () => 'Seções apuradas = seções esperadas', detail: 'O conjunto de dados publicado não traz a contagem de seções', run: () => null },
]

/** Every rule over every shard of the place (both turnos of every cycle): its pass, or its failures. */
export function checkPlace(shards: ReadonlyMap<string, LevelShard>, brasil: ReadonlyMap<string, LevelShard> | undefined, place: PlaceInfo, only?: (rule: RuleDef) => boolean): RuleResult[] {
  return RULES.filter((r) => !only || only(r)).map((rule) => {
    const failures: Failure[] = []
    let evaluated = 0
    for (const shard of shards.values()) {
      const found = rule.run(shard, { brasil: brasil?.get(`${shard.ano}-${shard.turno}`) })
      if (found === null) continue
      evaluated += 1
      for (const message of found) failures.push({ ano: shard.ano, turno: shard.turno, message })
    }
    return { id: rule.id, label: rule.label(place), detail: rule.detail, ok: failures.length ? false : evaluated ? true : null, failures }
  })
}

/** The rules listed on a level: Brasil has the full list; região and estado show their own (the cross-level sums and the row-level rules) and link to Brasil's. */
export const OWN_RULES = (level: PlaceInfo['level']): ((r: RuleDef) => boolean) => (level === 'brasil' ? () => true : (r) => r.id !== 'secoes')
