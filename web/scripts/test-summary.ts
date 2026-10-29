/**
 * One-line test results (`npm run test:summary`): runs both vitest configs (the node one and the Astro-container one)
 * and prints a line each, then only the names of what failed. The default reporters print a wall of text, and the rtk
 * hook that shortens command output swallows it; agents read this instead. Arguments are file filters for the main
 * config only (`npm run test:summary -- src/theme.test.ts`). Exit code 1 when anything failed.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface VitestJson {
  numPassedTests: number
  numFailedTests: number
  testResults: { name: string; status: string; message?: string; assertionResults?: { fullName: string; status: string }[] }[]
}

const shortName = (name: string): string => name.replace(/^.*?\/web\//, '')

/** The summary lines of one run: counts first, then one line per failed test (or per suite that failed to load). */
export function summarize(label: string, json: VitestJson): string[] {
  const lines = [`${label}: ${json.numPassedTests} passed, ${json.numFailedTests} failed (${json.testResults.length} files)`]
  for (const suite of json.testResults) {
    const failed = (suite.assertionResults ?? []).filter((a) => a.status === 'failed')
    for (const a of failed) lines.push(`  FAIL ${shortName(suite.name)} > ${a.fullName}`)
    if (suite.status === 'failed' && failed.length === 0) lines.push(`  FAIL ${shortName(suite.name)}: ${(suite.message ?? '').split('\n')[0]}`)
  }
  return lines
}

function run(label: string, args: string[], dir: string): { lines: string[]; ok: boolean } {
  const out = join(dir, `${label}.json`)
  spawnSync('npx', ['vitest', 'run', ...args, '--reporter=json', `--outputFile=${out}`], { stdio: 'ignore' })
  try {
    const json = JSON.parse(readFileSync(out, 'utf8')) as VitestJson
    return { lines: summarize(label, json), ok: json.numFailedTests === 0 && !json.testResults.some((s) => s.status === 'failed') }
  } catch {
    return { lines: [`${label}: no result (vitest did not write a report; run \`npx vitest run\` to see why)`], ok: false }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const filters = process.argv.slice(2)
  const dir = mkdtempSync(join(tmpdir(), 'test-summary-'))
  const runs = [run('unit', filters, dir)]
  if (filters.length === 0) runs.push(run('components', ['-c', 'vitest.astro.config.ts'], dir))
  rmSync(dir, { recursive: true, force: true })
  for (const r of runs) console.log(r.lines.join('\n'))
  process.exit(runs.every((r) => r.ok) ? 0 : 1)
}
