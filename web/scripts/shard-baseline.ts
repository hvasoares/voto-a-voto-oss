/**
 * The oracle of ticket #139: what the shard plumbing (data directory, fingerprint files, shard building) produces
 * today, recorded in `shard-baseline.json` BEFORE the shared helper existed and pinned by `shard-plumbing.test.ts`.
 * It reads the dataset with plain `readFileSync` on purpose: an oracle that used the helper would pass whatever the helper did.
 * Regenerate (only for a deliberate change of the output): `npx tsx scripts/shard-baseline.ts > scripts/shard-baseline.json`.
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildShards, type ShardSources } from '../integrations/shards'

export const WEB = resolve(fileURLToPath(new URL('..', import.meta.url)))
export const CHECK_SCRIPTS = ['shard-check', 'texts-check', 'facts-check', 'peers-check', 'margin-check', 'curiosities-check'] as const
const FILES = ['candidates.csv', 'centroids.csv', 'cities.csv', 'manifest.json', 'turnout.csv', 'votes.csv'] as const
const sha = (s: string): string => createHash('sha256').update(s).digest('hex')

/** sha256 of every file of the fixture shard tree (shards and fingerprint directory), keyed by path. */
export function shardTreeHashes(dir = resolve(WEB, 'fixtures/data')): Record<string, string> {
  const sources = {} as ShardSources
  for (const f of FILES) sources[f] = readFileSync(resolve(dir, f), 'utf8')
  const built = buildShards(sources)
  const out: Record<string, string> = {}
  for (const f of built.files) out[f.path] = sha(f.json)
  return out
}

export type Scenario = 'green' | 'no-dir' | 'no-file' | 'empty-shard-source'
export const SCENARIOS: Scenario[] = ['green', 'no-dir', 'no-file', 'empty-shard-source']
export interface Outcome {
  exit: number | null
  /** The first `Error:` line of stderr (red paths) or the first stdout line (green), with paths made relative. */
  message: string
  /** sha256 of the whole normalised stdout. */
  stdout: string
}

/** The data directory of a scenario: a copy of the fixture dataset broken in the named way, or undefined (DATA_DIR unset). */
export function scenarioDir(scenario: Scenario, root: string): string | undefined {
  if (scenario === 'green') return undefined
  const d = join(root, scenario)
  if (scenario === 'no-dir') return d
  cpSync(resolve(WEB, 'fixtures/data'), d, { recursive: true })
  if (scenario === 'no-file') rmSync(join(d, 'centroids.csv'))
  else writeFileSync(join(d, 'votes.csv'), '')
  return d
}

function run(script: string, dir: string | undefined, root: string): Promise<Outcome> {
  const env = { ...process.env }
  delete env.DATA_DIR
  if (dir) env.DATA_DIR = dir
  return new Promise((done) => {
    const child = spawn(resolve(WEB, 'node_modules/.bin/tsx'), [`scripts/${script}.ts`], { cwd: WEB, env })
    let out = ''
    let err = ''
    child.stdout.on('data', (b) => (out += b))
    child.stderr.on('data', (b) => (err += b))
    child.on('close', (exit) => {
      const norm = (s: string): string => s.replaceAll(root, '<tmp>').replaceAll(WEB, '<web>')
      const errLine = norm(err).split('\n').find((l) => /^\w*Error: /.test(l))
      done({ exit, message: errLine ?? norm(out).split('\n')[0]!, stdout: sha(norm(out)) })
    })
  })
}

/** Every check script on every scenario. */
export async function checkOutcomes(): Promise<Record<string, Outcome>> {
  const root = mkdtempSync(join(tmpdir(), 'shard-baseline-'))
  try {
    const dirs = Object.fromEntries(SCENARIOS.map((s) => [s, scenarioDir(s, root)])) as Record<Scenario, string | undefined>
    const jobs = CHECK_SCRIPTS.flatMap((script) => SCENARIOS.map((s) => run(script, dirs[s], root).then((o) => [`${script}/${s}`, o] as const)))
    return Object.fromEntries(await Promise.all(jobs))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = shardTreeHashes()
  if (JSON.stringify(a) !== JSON.stringify(shardTreeHashes())) throw new Error('the fixture shard tree is not deterministic')
  writeFileSync(1, JSON.stringify({ tree: a, checks: await checkOutcomes() }, null, 2) + '\n')
}
