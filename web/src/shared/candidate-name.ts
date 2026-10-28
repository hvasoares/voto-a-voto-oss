import { identityOfUrna } from './candidates'
import { displayName } from './city-search'

/** "Candidato A" of the example data is shown as "A" in tight places (the frames' wording); real names have their own short form. */
const exampleShort = (full: string) => /^Candidato [A-Z]$/.test(full) ? full.slice(-1) : full.split(/[\s-]+/)[0] ?? full

/**
 * The name of a candidate as the site shows it: from the table when the ballot name is in it, otherwise the TSE name in
 * mixed case (`displayName`) and, for the short form, its first word. The ONLY function that spells a candidate (it lives apart from the table so the pages that only need the colours do not load `displayName`).
 */
export function candidateName(urna: string, form: 'full' | 'short' = 'full'): string {
  const id = identityOfUrna(urna)
  if (id) return id[form === 'full' ? 'name' : 'short']
  const full = displayName(urna)
  return form === 'full' ? full : exampleShort(full)
}

