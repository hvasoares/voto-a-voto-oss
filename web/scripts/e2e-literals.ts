/**
 * Ticket #132's census: prints, per e2e spec file, the CANONICAL tokens of every viewport, no-JavaScript,
 * data-guard and notice-acknowledgement usage it finds, as JSON:
 *
 *   tsx scripts/e2e-literals.ts            → { "e2e/x.spec.ts": { "390|844": 2, "nojs": 1, ... }, ... }
 *   tsx scripts/e2e-literals.ts --map      → the old-literal → preset mapping table of #132
 *
 * Canonical tokens: a viewport is "<width>|<height>" (digits for literals — preset identifiers
 * resolve through PRESET_VALUES below, which e2e/presets.test.ts asserts equals e2e/presets.ts — or the
 * expression for parameterised forms), "nojs" per no-JavaScript site, "guard|<dir>|<file>" per data guard
 * ("DATA_DIR" when the variable itself is required unset-set independent), "ack" per notice write.
 * Run it before and after a migration on the same tree state of spec sources: the two JSONs diff empty.
 */
import { globSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const web = fileURLToPath(new URL('..', import.meta.url))

/** The values every preset name stands for; kept exact by e2e/presets.test.ts against e2e/presets.ts. */
export const PRESET_VALUES: Record<string, { width: number; height: number }> = {
  PHONE: { width: 390, height: 844 },
  DESKTOP: { width: 1440, height: 900 },
  WIDE_BAND: { width: 1440, height: 300 },
  BELOW_FOLD: { width: 1440, height: 160 },
  SOBRE_FRAME: { width: 1280, height: 900 },
  OVERLAY_FRAME: { width: 1280, height: 720 },
  OG_CARD: { width: 480, height: 476 },
  ULTRAWIDE: { width: 1800, height: 900 },
  PRINT_A4: { width: 794, height: 1123 },
  DUEL: { width: 1920, height: 1080 },
  UNDER_BREAKPOINT: { width: 1023, height: 900 },
}

const TOKEN = '[A-Za-z0-9_.[\\]]+'
const NAMES = Object.keys(PRESET_VALUES).join('|')

/** Replaces comments with spaces (string contents kept; positions unchanged) so comment text never tokens. */
function stripComments(src: string): string {
  let out = ''
  let i = 0
  let quote: string | null = null
  while (i < src.length) {
    const ch = src[i]!
    if (quote) {
      out += ch
      if (ch === '\\') {
        out += src[i + 1] ?? ''
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i++
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      out += ch
      i++
      continue
    }
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') {
        out += ' '
        i++
      }
      continue
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end === -1 ? src.length : end + 2
      while (i < stop) {
        out += ' '
        i++
      }
      continue
    }
    out += ch
    i++
  }
  return out
}

/** Spaces over a matched span in place, so later rules cannot see the consumed identifiers. */
const blank = (text: string, index: number, length: number): string => text.slice(0, index) + ' '.repeat(length) + text.slice(index + length)

const canon = (tok: string): string => (/^\d+$/.test(tok) ? tok : tok)

/** The canonical viewport/no-js/guard/notice tokens of one source file (a multiset as token → count). */
export function literalTokens(source: string): Record<string, number> {
  let text = stripComments(source)
  // The migration's own import line lists the preset names — it is not a usage.
  text = text.replace(/^import\s*\{[^}]*\}\s*from\s*'\.\/presets'\s*;?$/gm, (s) => ' '.repeat(s.length))
  const counts: Record<string, number> = {}
  const add = (token: string) => {
    counts[token] = (counts[token] ?? 0) + 1
  }

  // 1. viewport(a, b) call — the parameterised form's after-migration spelling.
  for (const m of text.matchAll(new RegExp(`viewport\\s*\\(\\s*(${TOKEN})\\s*,\\s*(${TOKEN})\\s*\\)`, 'g'))) {
    add(`${canon(m[1]!)}|${canon(m[2]!)}`)
    text = blank(text, m.index!, m[0].length)
  }
  // 2. "viewport: <identifier>" (never a `{` literal and never another call, both consumed already).
  for (const m of text.matchAll(/\bviewport\s*:\s*([A-Za-z_][\w.$]*)\b(?!\s*\()/g)) {
    const name = m[1]!
    add(PRESET_VALUES[name] ? `${PRESET_VALUES[name]!.width}|${PRESET_VALUES[name]!.height}` : `ident|viewport:${name}`)
    text = blank(text, m.index!, m[0].length)
  }
  // 3. Long-form pair: width: <t>, height: <t>.
  for (const m of text.matchAll(new RegExp(`\\bwidth\\s*:\\s*(${TOKEN})\\s*,\\s*height\\s*:\\s*(${TOKEN})`, 'g'))) {
    add(`${canon(m[1]!)}|${canon(m[2]!)}`)
    text = blank(text, m.index!, m[0].length)
  }
  // 4. Shorthand "{ width, height: <t> }".
  for (const m of text.matchAll(new RegExp(`[{,]\\s*width\\s*,\\s*height\\s*:\\s*(${TOKEN})\\s*\\}`, 'g'))) {
    add(`width|${canon(m[1]!)}`)
    text = blank(text, m.index!, m[0].length)
  }
  // 5. Standalone preset names (setViewportSize(PHONE), table entries, spreads).
  for (const m of text.matchAll(new RegExp(`\\b(${NAMES})\\b`, 'g'))) {
    add(`${PRESET_VALUES[m[1]!]!.width}|${PRESET_VALUES[m[1]!]!.height}`)
    text = blank(text, m.index!, m[0].length)
  }
  // 6-7. No-JavaScript sites: the raw option or one noJs()/useNoJs() call.
  for (const m of text.matchAll(/javaScriptEnabled\s*:\s*[A-Za-z0-9_.$]+/g)) {
    add('nojs')
    text = blank(text, m.index!, m[0].length)
  }
  for (const m of text.matchAll(/(?:(?<!use)\bnoJs|useNoJs)\s*\(/g)) {
    add('nojs')
    text = blank(text, m.index!, m[0].length)
  }
  // 8. Data guards, raw — every raw guard is a single line, so the body must stay on it (a multiline
  // lookahead would otherwise swallow the helper call it replaced and the next stray existsSync).
  for (const m of text.matchAll(/test\.skip\s*\([^\n]*\bexistsSync\s*\([^)]*\)[^\n]*/g)) {
    const body = m[0]
    const exact = body.match(/DATA_DIR\s*!==\s*'([^']+)'/)
    const single = body.match(/resolve\(\s*'([^']+)'/)
    const viaEnv = body.match(/resolve\(\s*process\.env\.DATA_DIR\s*,\s*'([^']+)'/)
    if (exact && single) add(`guard|req=${exact[1]}|${single[1]!.split('/').pop()}`)
    else if (viaEnv) add(`guard|DATA_DIR|${viaEnv[1]}`)
    else if (single) {
      const p = single[1]!
      add(`guard|${p.slice(0, p.lastIndexOf('/'))}|${p.split('/').pop()}`)
    }
    text = blank(text, m.index!, m[0].length)
  }
  // …and via the helper.
  for (const m of text.matchAll(/dataGuard\s*\(([^)]*)\)/g)) {
    const args = m[1]!.trim()
    const file = args.match(/^'([^']+)'/)?.[1] ?? 'cities.csv'
    const req = args.match(/process\.env\.DATA_DIR\s*===\s*'([^']+)'\s*\?/)
    const named = args.match(/,\s*'([^']+)'/)
    if (req) add(`guard|req=${req[1]}|${file}`)
    else if (/\?\?\s*null/.test(args)) add(`guard|DATA_DIR|${file}`)
    else if (named) add(`guard|${named[1]}|${file}`)
    else add(`guard|../data|${file}`)
    text = blank(text, m.index!, m[0].length)
  }
  // 9-10. Notice writes: the raw storage key or the helper call.
  for (const m of text.matchAll(/voto-a-voto:notice/g)) {
    add('ack')
    text = blank(text, m.index!, m[0].length)
  }
  for (const m of text.matchAll(/\backnowledgeNotice\s*\(/g)) {
    add('ack')
    text = blank(text, m.index!, m[0].length)
  }
  return counts
}

/** The migration table #132 attaches to its PR: every old literal and the preset that replaces it. */
const MAP_ROWS: [string, string][] = [
  ['390x844', 'PHONE'],
  ['1440x900', 'DESKTOP'],
  ['1440x300 (nerds chart bands)', 'WIDE_BAND'],
  ['1440x160 (estado map slot below the fold)', 'BELOW_FOLD'],
  ['1280x900 (sobre desktop frame)', 'SOBRE_FRAME'],
  ['1280x720 (overlay transparency canvas)', 'OVERLAY_FRAME'],
  ['480x476 (og:image render)', 'OG_CARD'],
  ['1800x900 (1440+ column check)', 'ULTRAWIDE'],
  ['794x1123 (A4 print)', 'PRINT_A4'],
  ['1920x1080 (modo duelo)', 'DUEL'],
  ['1023x900 (just under the breakpoint)', 'UNDER_BREAKPOINT'],
  ['{ width, height: … } parameterised', 'viewport(width, height)'],
  ['javaScriptEnabled: false', 'noJs() / useNoJs()'],
  ['test.skip(!existsSync(resolve(...)) ...)', 'test.skip(...dataGuard())'],
  ["addInitScript(() => localStorage.setItem('voto-a-voto:notice', 'acknowledged'))", 'acknowledgeNotice(page)'],
]

if (process.argv[1]?.endsWith('e2e-literals.ts')) {
  if (process.argv.includes('--map')) {
    console.log(JSON.stringify(MAP_ROWS, null, 2))
  } else {
    const files = globSync('e2e/**/*.ts', { cwd: web }).filter((f) => !f.endsWith('presets.ts') && !f.endsWith('.test.ts')).sort()
    const out: Record<string, Record<string, number>> = {}
    for (const f of files) {
      const tokens = literalTokens(readFileSync(`${web}/${f}`, 'utf8'))
      out[f] = Object.fromEntries(Object.entries(tokens).sort(([a], [b]) => a.localeCompare(b)))
    }
    console.log(JSON.stringify(out, null, 2))
  }
}
