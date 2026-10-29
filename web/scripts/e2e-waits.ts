/**
 * The "specs wait on attributes, not fixed timeouts" check (#123): a pure, browser-free scan of one spec
 * source plus the allowlist handling. The vitest file `e2e-waits.test.ts` walks every e2e file with it
 * (`npm test`, hence CI) and proves, on string fixtures, that the check can fail.
 *
 * Rules:
 * - `fixed-wait` (error): `waitForTimeout(`, a sleep built as `new Promise(r => setTimeout(...))`, or a
 *   `setTimeout(` inside a `page.evaluate(` / `waitForFunction(` body. None of these waits on a state of
 *   the page; they guess a duration. Intentional ones (a negative window: something must NOT happen and
 *   carries no attribute) live in `web/e2e/wait-allowlist.json` with a reason.
 * - `bare-read` (warning): a one-shot read (`textContent()`, `innerText()`, `getAttribute(`, `isVisible()`,
 *   `isHidden()`, `count()`, `inputValue()`, `page.$(`, `page.$$(`, an `evaluate(` that reads data attributes or text)
 *   feeding an expectation without a retry. Exempt when an awaited web-first assertion
 *   (`toHaveAttribute` / `toBeVisible` / `toHaveText` / `toHaveCount`) covers it within the 3 lines above.
 *   Warnings are reported, not failed: the point of one PR is the fixed waits; the warning count is the
 *   backlog meter for the bare reads.
 * - `msgless-wait` (warning): `waitForFunction(` with a single argument. Passing the options argument lets
 *   a failure name what was waited for (and how long).
 */

export type WaitRule = 'fixed-wait' | 'bare-read' | 'msgless-wait'
export type WaitSeverity = 'error' | 'warning'

export interface WaitFinding {
  file: string
  /** 1-based. */
  line: number
  rule: WaitRule
  severity: WaitSeverity
  /** The trimmed source line. */
  text: string
}

export interface AllowEntry {
  /** Path relative to web/, e.g. "e2e/replay.spec.ts". */
  file: string
  rule: WaitRule
  /** The exact trimmed source line the entry covers (never a line number: an edited line drops out). */
  match: string
  reason: string
}

const isComment = (line: string) => line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')

/** `setTimeout(` that is not the test runner's own overall budget (`test.setTimeout(240_000)`). */
const PAGE_SET_TIMEOUT = /(?<![\w.])setTimeout\s*\(|(?<![\w.])window\.setTimeout\s*\(/
const SLEEP_PROMISE = /\bnew\s+Promise\s*(<[^>]*>)?\s*\(\s*\(?\s*\w+\s*\)?\s*=>\s*[^;]*\bsetTimeout\s*\(/
const OPENS_BROWSER_CALL = /\b(?:evaluate|waitForFunction)\s*\(/
const BARE_READ = /\.(?:textContent|innerText|isVisible|isHidden|inputValue|count)\(\)|\.getAttribute\(|(?<![\w.])\$\$?\(/
const READS_TEXT_OR_DATA = /\btextContent\b|\binnerText\b|\binnerHTML\b|\.getAttribute\(|\bdataset\.|\bgetAttributeNS\(/
const WEB_FIRST = /await\s+expect\([\s\S]*?\.(?:toHaveAttribute|toBeVisible|toHaveText|toHaveCount)\(/

const braces = (line: string) => (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0)

/** One finding per banned line; the finding's `text` is the trimmed line (what an allowlist entry keys on). */
export function findViolations(source: string, file: string): WaitFinding[] {
  const found: WaitFinding[] = []
  const push = (line: number, rule: WaitRule, severity: WaitSeverity, text: string) => found.push({ file, line, rule, severity, text })
  const lines = source.split('\n')

  // Depth of an open page.evaluate( / waitForFunction( body (a fixed wait inside the page is still a fixed wait).
  let bodyDepth = 0
  /** Which call opened the body: a waitForFunction retries, so reads inside it are not bare. */
  let bodyIsEvaluate = false
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim()
    const n = i + 1
    if (!isComment(line)) {
      const opensCall = OPENS_BROWSER_CALL.test(line)
      const opensRetrying = /\bwaitForFunction\s*\(/.test(line)
      if (/\bwaitForTimeout\s*\(/.test(line)) push(n, 'fixed-wait', 'error', line)
      else if (SLEEP_PROMISE.test(line)) push(n, 'fixed-wait', 'error', line)
      else if (PAGE_SET_TIMEOUT.test(line) && (opensCall || bodyDepth > 0)) push(n, 'fixed-wait', 'error', line)

      const recent = lines.slice(Math.max(0, i - 3), i + 1).join('\n')
      if (BARE_READ.test(line) && !opensRetrying && !(bodyDepth > 0 && !bodyIsEvaluate) && !WEB_FIRST.test(recent)) push(n, 'bare-read', 'warning', line)
      if (opensCall) {
        // An evaluate( whose body reads data attributes or text is a one-shot read; a waitForFunction( retries and is fine.
        if (/\bevaluate\s*\(/.test(line)) {
          let depth = braces(raw)
          const body = [raw]
          for (let j = i + 1; depth > 0 && j < lines.length; j++) {
            body.push(lines[j]!)
            depth += braces(lines[j]!)
          }
          if (READS_TEXT_OR_DATA.test(body.join('\n'))) push(n, 'bare-read', 'warning', line)
        }
        if (opensRetrying && waitForFunctionArgCount(lines, i) < 2) push(n, 'msgless-wait', 'warning', line)
      }
      const delta = braces(raw)
      if (opensCall) {
        bodyIsEvaluate = /\bevaluate\s*\(/.test(line)
        bodyDepth = Math.max(0, delta)
      } else if (bodyDepth > 0) {
        bodyDepth = Math.max(0, bodyDepth + delta)
      }
    }
  }
  return found
}

/** Counts the top-level arguments of the waitForFunction( call that starts on `lines[start]`. */
function waitForFunctionArgCount(lines: string[], start: number): number {
  let text = ''
  let depth = 0
  let begun = false
  for (let j = start; j < lines.length; j++) {
    for (const ch of lines[j]!) {
      if (ch === '(') (depth++, (begun = true))
      else if (ch === ')') depth--
      text += ch
      if (begun && depth === 0) break
    }
    text += '\n'
    if (begun && depth === 0) break
  }
  // Top-level commas, skipping the nested () {} [] so arrow bodies do not count as arguments.
  let parens = 0
  let curlies = 0
  let squares = 0
  let args = 1
  let seenNonSpace = false
  for (const ch of text.slice(text.indexOf('(') + 1, text.endsWith(')\n') ? -2 : -1)) {
    if (ch === '(') parens++
    else if (ch === ')') parens--
    else if (ch === '{') curlies++
    else if (ch === '}') curlies--
    else if (ch === '[') squares++
    else if (ch === ']') squares--
    else if (ch === ',' && parens === 0 && curlies === 0 && squares === 0) args++
    else if (seenNonSpace === false && !/\s/.test(ch)) seenNonSpace = true
  }
  return seenNonSpace ? args : 0
}

export interface AllowlistResult {
  /** Why the check fails (stale entries, reasonless entries). Empty when the allowlist is sound. */
  problems: string[]
  /** The findings no entry covers. */
  remaining: WaitFinding[]
}

/**
 * Suppresses findings an entry covers (same file, same rule, same trimmed line) and reports the entries
 * that stopped matching: an entry whose `file` is not among the sources, or whose `match` is no trimmed
 * line of it any more, is stale — the line it blessed was edited or removed, so the blessing must go.
 */
export function applyAllowlist(findings: WaitFinding[], entries: AllowEntry[], sources: Map<string, string>): AllowlistResult {
  const problems: string[] = []
  const used = new Set<number>()
  const remaining = findings.filter((f) => {
    const idx = entries.findIndex((e) => e.file === f.file && e.rule === f.rule && e.match === f.text)
    if (idx === -1 || used.has(idx)) return true
    if (f.severity !== 'error') return true
    used.add(idx)
    return false
  })
  entries.forEach((entry, idx) => {
    const label = `${entry.file} — "${entry.match}"`
    if (!entry.reason?.trim()) problems.push(`allowlist entry without a reason: ${label}`)
    const source = sources.get(entry.file)
    if (source === undefined) problems.push(`stale allowlist entry (no such file): ${label}`)
    else if (!source.split('\n').some((l) => l.trim() === entry.match)) problems.push(`stale allowlist entry (no matching line): ${label}`)
  })
  return { problems, remaining }
}
