/**
 * THE identity table of the two runoff candidates of each cycle (#84): how the site spells them and which colour is theirs.
 * Every screen and artefact that names or colours a candidate reads it (the City card and its legend, the three-cycle pages,
 * the maps, /brasil/, /comparar/, the reports, the share picture and the link preview): nothing else in the code spells a
 * candidate or picks a colour for one.
 *
 * - `urna`: how the TSE writes the ballot name in `candidates.csv` (upper case, no accent: "FLAVIO BOLSONARO"); the key
 *   the data is matched by.
 * - `name`: how the site shows it, with the accents people write ("Flávio Bolsonaro"), the same on every screen.
 * - `short`: the form for tight places (map labels, narrow bars, table heads): the first name, or the surname when that
 *   is what the person is called ("Haddad", "Bolsonaro"). A short form is data here, never per-screen code.
 * - `side` and `color`: the semantic pair. The candidate with the lower ballot number is side `a` and always the red of
 *   `colors.lula`; the other is side `b` and always the blue of `colors.bolsonaro`. The colour belongs to the pair of the
 *   cycle, not to a party (2018: Haddad red, Bolsonaro blue). Colour is never the only cue: names and numbers are printed.
 */
export type RunoffCycle = 2018 | 2022 | 2026
export type Side = 'a' | 'b'

export interface CandidateIdentity {
  numero: number
  urna: string
  name: string
  short: string
  side: Side
  /** The colour token (`colors[color]` in shared/tokens, `--c-<color>` in CSS). */
  color: 'lula' | 'bolsonaro'
}

/** The TSE ballot name of a shown name: upper case, no accents ("Flávio Bolsonaro" -> "FLAVIO BOLSONARO"), so the table keeps one spelling. */
const urnaOf = (name: string): string => name.normalize('NFD').replace(/\p{M}+/gu, '').toUpperCase()
const make = (side: Side, color: CandidateIdentity['color'], numero: number, name: string, short = name): CandidateIdentity => ({ numero, urna: urnaOf(name), name, short, side, color })
const left = (numero: number, name: string, short?: string) => make('a', 'lula', numero, name, short)
const right = (numero: number, name: string, short?: string) => make('b', 'bolsonaro', numero, name, short)

export const CANDIDATES: Readonly<Record<RunoffCycle, readonly [CandidateIdentity, CandidateIdentity]>> = {
  2018: [left(13, 'Fernando Haddad', 'Haddad'), right(17, 'Jair Bolsonaro', 'Bolsonaro')],
  2022: [left(13, 'Lula'), right(22, 'Jair Bolsonaro', 'Bolsonaro')],
  2026: [left(13, 'Lula'), right(22, 'Flávio Bolsonaro', 'Flávio')],
}

const ALL = Object.values(CANDIDATES).flat()

/** The identity of candidate `numero` in the runoff of `ano`; undefined for anyone else (round 1 runners-up, the fixture's "Candidato A"). */
export function identityOf(ano: number, numero: number): CandidateIdentity | undefined {
  return CANDIDATES[ano as RunoffCycle]?.find((c) => c.numero === numero)
}

/** The identity of a ballot name, in any cycle (a name spells one person: the table never maps one `urna` to two spellings). */
export function identityOfUrna(urna: string): CandidateIdentity | undefined {
  const key = urnaOf(urna.trim())
  return ALL.find((c) => c.urna === key)
}

/**
 * The colour side of a candidate drawn in the position `fallback` of a pair: the table's side when the candidate is in the
 * runoff of that cycle; neutral (`outros`) when it is not but its companion is (a round 1 runner-up beside a runoff
 * candidate must not wear the colour of the other side); the position itself when neither is in the table (example data).
 */
export function sideTone(ano: number, numero: number | undefined, other: number | undefined, fallback: Side): Side | 'outros' {
  const own = numero === undefined ? undefined : identityOf(ano, numero)
  if (own) return own.side
  return other !== undefined && identityOf(ano, other) ? 'outros' : fallback
}
