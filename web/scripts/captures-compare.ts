/**
 * #133's identity oracle: compares two capture trees (a baseline recorded on main and the run of the same
 * suite after the helper migration) and answers "Identical" per the ticket:
 *   1. the file lists are identical (same names);
 *   2. every JSON sidecar hashes equal after the same normalisation — the `capture` path made relative to
 *      .captures/ (the pre-#133 sidecars carried an absolute, checkout-dependent path; the post-#133 ones
 *      carry the relative ref by contract) and the new `fontsReady` key excluded — and fontsReady must be
 *      true wherever it appears;
 *   3. every PNG hashes byte-identical; where Chromium output is not deterministic (fonts, antialiasing),
 *      the fallback is a size within 1% AND a raw-pixel diff of 0 changed pixels (sharp). A PNG needing the
 *      fallback is listed.
 *
 * Usage: tsx scripts/captures-compare.ts <baselineDir> <newDir>   (exit 1 on any mismatch)
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import sharp from 'sharp'

export interface TreeFile {
  name: string
  size: number
}

/** The recursive file list of a tree: relative names with forward slashes, sorted, with sizes. */
export function walkTree(dir: string): TreeFile[] {
  const out: TreeFile[] = []
  const step = (at: string, prefix: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(at, entry.name)
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) step(full, rel)
      else out.push({ name: rel, size: statSync(full).size })
    }
  }
  step(dir, '')
  return out
}

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')

/** Canonical stringify: keys sorted at every level, so field order never enters the comparison. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_, v: unknown) =>
    v !== null && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  )

/**
 * The sidecar, normalised: `capture` made relative to .captures/ (an absolute path is sliced at the
 * `/.captures/` boundary) and `fontsReady` dropped — the key did not exist before #133 and its truth is
 * asserted separately.
 */
export function normaliseSidecar(text: string): { canonicalText: string; fontsReady?: boolean } {
  const parsed = JSON.parse(text) as Record<string, unknown> & { capture?: unknown; fontsReady?: unknown }
  const fontsReady = parsed.fontsReady as boolean | undefined
  delete parsed.fontsReady
  const capture = parsed.capture
  if (typeof capture === 'string') {
    const marker = `${sep}.captures${sep}`
    const at = capture.indexOf(marker)
    parsed.capture = at === -1 ? capture.split(sep).join('/') : capture.slice(at + marker.length).split(sep).join('/')
  }
  return { canonicalText: canonical(parsed), fontsReady }
}

/** Two PNG buffers with identical dimensions and their count of differing raw bytes (0 = pixel-identical). */
export async function changedPixels(a: Buffer, b: Buffer): Promise<number | 'dimensions'> {
  const ra = await sharp(a).raw().toBuffer({ resolveWithObject: true })
  const rb = await sharp(b).raw().toBuffer({ resolveWithObject: true })
  if (ra.info.width !== rb.info.width || ra.info.height !== rb.info.height || ra.info.channels !== rb.info.channels) return 'dimensions'
  let changed = 0
  for (let i = 0; i < ra.data.length; i++) if (ra.data[i] !== rb.data[i]) changed++
  return changed
}

export interface CompareReport {
  ok: boolean
  lines: string[]
}

/** The full comparison of two trees: file list, sidecar hashes, png hashes with the pixel fallback. */
export async function compareTrees(baselineDir: string, newDir: string): Promise<CompareReport> {
  const lines: string[] = []
  const fail = (line: string) => lines.push(`FAIL ${line}`)
  const baseline = walkTree(baselineDir)
  const next = walkTree(newDir)
  const names = (files: TreeFile[]) => new Set(files.map((f) => f.name))
  const bNames = names(baseline)
  const nNames = names(next)
  for (const f of baseline) if (!nNames.has(f.name)) fail(`missing in new tree: ${f.name}`)
  for (const f of next) if (!bNames.has(f.name)) fail(`added in new tree: ${f.name}`)

  const fallback: string[] = []
  for (const f of baseline) {
    if (!nNames.has(f.name)) continue
    const a = readFileSync(join(baselineDir, ...f.name.split('/')))
    const b = readFileSync(join(newDir, ...f.name.split('/')))
    if (f.name.endsWith('.json')) {
      const na = normaliseSidecar(a.toString('utf8'))
      const nb = normaliseSidecar(b.toString('utf8'))
      if (nb.fontsReady === false) fail(`${f.name}: fontsReady is false — a fallback-font capture`)
      if (sha256(na.canonicalText) !== sha256(nb.canonicalText)) fail(`${f.name}: sidecar content changed`)
    } else if (sha256(a) === sha256(b)) {
      lines.push(`ok   ${f.name}`)
    } else {
      const pixels = await changedPixels(a, b)
      const sizeOk = Math.abs(a.length - b.length) <= Math.max(1, Math.round(a.length * 0.01))
      if (pixels === 0 && sizeOk) fallback.push(f.name)
      else fail(`${f.name}: png drifted (size ${a.length} → ${b.length}${sizeOk ? '' : ' — over 1%'}, changed bytes ${pixels})`)
    }
  }
  for (const name of fallback) lines.push(`ok*  ${name} (pixel fallback: hash differs, 0 changed pixels, size within 1%)`)
  lines.push(`${baseline.length} files compared, ${fallback.length} png(s) needed the pixel fallback`)
  return { ok: !lines.some((l) => l.startsWith('FAIL')), lines }
}

const isMain = process.argv[1] && resolve(process.argv[1]).endsWith('captures-compare.ts')
if (isMain) {
  const [baselineDir, newDir] = process.argv.slice(2)
  if (!baselineDir || !newDir || !existsSync(baselineDir) || !existsSync(newDir)) {
    console.error('usage: tsx scripts/captures-compare.ts <baselineDir> <newDir>')
    process.exit(2)
  }
  compareTrees(resolve(baselineDir), resolve(newDir)).then((report) => {
    for (const line of report.lines) console.log(line)
    process.exit(report.ok ? 0 : 1)
  })
}
