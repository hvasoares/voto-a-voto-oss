import { RULES } from './checks'

/**
 * Data contracts from footer claims (#77): a footer sentence that CLAIMS something checkable ("O total é a soma das linhas", "comparecimento + abstenção = 100%") is matched to
 * the executable rule that checks it (checks.ts). A footer with a claim that no rule checks fails the build, so a published claim and an executed check cannot drift.
 * Definitions ("Comparecimento = votantes ÷ eleitorado") are not claims.
 */
export const CLAIMS: { pattern: RegExp; rule: string }[] = [
  { pattern: /soma d(as|os) (linhas|UFs|regiões|municípios)/i, rule: 'soma-filhos' },
  { pattern: /é parte d[oa] Brasil/i, rule: 'parte-do-brasil' },
  { pattern: /comparecimento \+ abstenção = (100%|eleitorado)/i, rule: 'comparecimento-abstencao' },
  { pattern: /votos válidos \+ brancos \+ nulos = (100%|comparecimento)/i, rule: 'validos-brancos-nulos' },
  { pattern: /candidatos \+ brancos \+ nulos = votantes/i, rule: 'candidatos-brancos-nulos' },
  { pattern: /nenhum valor (negativo|acima de 100%)/i, rule: 'sem-negativos' },
  { pattern: /seções apuradas = seções esperadas/i, rule: 'secoes' },
]

/** A sentence that reads as a claim (a sum, a closing to 100%, a bound), whether or not a check exists for it. */
const CLAIM_LIKE = /(\bsoma d|\bsomam\b|= ?100 ?%|\bfecha(m)?\b|\bé parte d|nenhum valor)/i

/** Only what the footer asserts (definição, cálculo) can be a claim; "não mede" says what the panel does not cover. */
const CLAIM_FIELDS = ['definicao', 'calculo']

export const sentences = (text: string): string[] => text.split(/(?<=[.;])\s+/).map((s) => s.trim()).filter(Boolean)

/** The claims of a footer text and the rule that checks each (rule undefined = no check exists). */
export function claimsOf(text: string): { claim: string; rule: string | undefined }[] {
  return sentences(text).filter((s) => CLAIM_LIKE.test(s)).map((claim) => ({ claim, rule: CLAIMS.find((c) => c.pattern.test(claim))?.rule }))
}

/** Problems of a footer's claims: one line per claim that no executable check backs. */
export function claimProblems(panelId: string, footer: Record<string, string>): string[] {
  const known = new Set(RULES.map((r) => r.id))
  return Object.entries(footer).filter(([field]) => CLAIM_FIELDS.includes(field)).flatMap(([field, text]) =>
    claimsOf(text).flatMap(({ claim, rule }) =>
      rule === undefined || !known.has(rule) ? [`panel "${panelId}": footer claim "${claim}" (${field}) has no matching executable check`] : [],
    ),
  )
}
