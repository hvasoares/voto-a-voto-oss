/**
 * The steps a candidate's text gives way in (#82 card, #85 poster, link preview and recap): ONE algorithm, whatever the unit.
 * Name and share on one line, then the name wrapped over two lines with the share, then the full name over the share, then the
 * table's short form over the share, then the share alone. The name is never cut with an ellipsis; the caller measures each step
 * (characters in the card, SVG units in the pictures) and keeps the first that fits. `\n` separates the lines.
 */
export function candidateTries(name: string, pct: string, short?: string): string[] {
  const [first = '', ...rest] = name.split(' ')
  return [`${name} ${pct}`, ...(rest.length ? [`${first}\n${rest.join(' ')} ${pct}`] : []), `${name}\n${pct}`, `${short ?? first}\n${pct}`, pct]
}

/** The first step of `candidateTries` whose every line `fits`, or '' when nothing does (a sliver prints no text). */
export function pickCandidateText(name: string, pct: string, short: string | undefined, fits: (line: string, lines: number) => boolean): string {
  return candidateTries(name, pct, short).find((t) => { const ls = t.split('\n'); return ls.every((l) => fits(l, ls.length)) }) ?? ''
}
