/**
 * The manifest of the real-data sample (ticket #109) and the documentation it generates. The sample Playwright
 * project (`sample`) runs every `*real-data*.spec.ts` on disk minus `fullOnly` — built here from the spec list on
 * disk, never a copy of the `real` regex — and the guard in sample-manifest.test.ts fails naming the file when a
 * real-data spec is in neither the derived sample set nor `fullOnly` (and when a `fullOnly` entry is stale).
 * `docs/real-data-sample.md` is rendered from the manifest by this module (`npx tsx scripts/sample-manifest.ts
 * doc`) and the same guard refuses a hand-edited or stale copy, so the documentation cannot rot.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'
import { PAGE_BOUND } from './sample-data'

export interface SampleManifest {
  states: { uf: string; why: string }[]
  fullOnly: { spec: string; why: string }[]
  measured?: { date: string; pages: number; buildSeconds: number }
}

/** What a spec's filename must look like to be a real-data spec. */
export const REAL_DATA_SPEC = /real-data.*\.spec\.ts$/

export const docPath = (webRoot: string) => resolve(webRoot, 'docs/real-data-sample.md')

export function loadSampleManifest(webRoot: string): SampleManifest {
  return JSON.parse(readFileSync(resolve(webRoot, 'e2e/sample.json'), 'utf8')) as SampleManifest
}

/** Every real-data spec on disk, sorted. */
export function realDataSpecs(webRoot: string): string[] {
  return readdirSync(resolve(webRoot, 'e2e'))
    .filter((name) => REAL_DATA_SPEC.test(name))
    .sort()
}

/** The specs of the `sample` project: on-disk real-data specs minus fullOnly, sorted. */
export function sampleSpecs(manifest: SampleManifest, diskSpecs: readonly string[]): string[] {
  const excluded = new Set(manifest.fullOnly.map((f) => f.spec))
  return diskSpecs.filter((name) => !excluded.has(name)).sort()
}

/** testMatch entries for the sample project: one anchored regex per covered spec. */
export function sampleTestMatch(manifest: SampleManifest, diskSpecs: readonly string[]): RegExp[] {
  return sampleSpecs(manifest, diskSpecs).map((name) => new RegExp(`${name.replace(/\./g, '\\.')}$`))
}

export function renderSampleDoc(manifest: SampleManifest, diskSpecs: readonly string[]): string {
  const covered = sampleSpecs(manifest, diskSpecs)
  const ufs = manifest.states.map((s) => s.uf).join(', ')
  const measured = manifest.measured
    ? `Measured ${manifest.measured.date}: **${manifest.measured.pages.toLocaleString('pt-BR')} pages in ${manifest.measured.buildSeconds}s** (gate: under 180s; page bound ${PAGE_BOUND.toLocaleString('pt-BR')}).`
    : 'Not measured yet — run `make e2e-sample` and record the numbers here through `sample.json`.'
  const row = (cells: string[]) => `| ${cells.join(' | ')} |`
  return `# Real-data sample (ticket #109)

GENERATED from \`web/e2e/sample.json\` by \`npx tsx scripts/sample-manifest.ts doc\` — do not edit by hand;
\`web/scripts/sample-manifest.test.ts\` refuses a stale or hand-edited copy.

The full real-data run (\`make e2e-real\` / \`npm --prefix web run test:real\`, all 5.760 cities) is unchanged and
stays the release gate. The sample is the pre-push step: \`make e2e-sample\` builds a subset dataset
(\`DATA_DIR=.sample-data OUT_DIR=dist-sample\`, git-ignored) and runs the \`sample\` Playwright project over it with
\`E2E_PREBUILT=1\`, so a full-data run can never silently use the sample build (the stamp records the data dir, #108).

${measured}

## States of the sample (${ufs})

${row(['uf', 'why'])}
${row(['---', '---'])}
${manifest.states.map((s) => row([`\`${s.uf}\``, s.why])).join('\n')}

## Specs the sample covers (${covered.length})

${covered.map((s) => `- \`${s}\``).join('\n')}

## Specs that need the full build (${manifest.fullOnly.length})

${row(['spec', 'why'])}
${row(['---', '---'])}
${manifest.fullOnly.map((f) => row([`\`${f.spec}\``, f.why])).join('\n')}

## The 1.13.0 backtest

\`web/scripts/sample-backtest.sh\` re-runs the failures that escaped 1.13.0 against the sample in throwaway git
worktrees (parent of the fixing commit must be RED, the fix GREEN): the disputas data-race id of 4bd5da4, the
three-cycles 2018 candidate name of 9a2e801 and the donation-footer regex of 71f4e2e. \`c29dd4d\` is deliberately
not a case: it changed a fixture-project spec that the sample cannot see. Known limitation: the 9a2e801 case is
RED on both sides — the named test asserts the national six-largest ordering before the candidate name, which no
subset inside the page bound reproduces; its parent-side RED still shows the sample runs the tres-ciclos page.
`
}

// CLI: `npx tsx scripts/sample-manifest.ts doc` regenerates docs/real-data-sample.md from e2e/sample.json.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2] === 'doc') {
  const webRoot = fileURLToPath(new URL('..', import.meta.url))
  writeFileSync(docPath(webRoot), renderSampleDoc(loadSampleManifest(webRoot), realDataSpecs(webRoot)))
  console.log(`wrote ${docPath(webRoot)}`)
}
