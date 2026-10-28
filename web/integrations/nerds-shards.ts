import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { dataDir } from '../src/lib/data-dir'

/**
 * Ships the level shards an island fetches (#76): when a row of the Tabela de detalhe opens, the island reads the shard of that região (its UFs) or UF (its municípios), for the cycle
 * on screen. Only `regiao/` and `uf/` are copied (the Brasil shards are read at build time only), to `public/data/v<fingerprint>/nerds/`: the same version directory as the other
 * shards, so a stale copy is never served. About 3.3 MB raw for the whole dataset (162 + 30 files); nothing per city beyond what the shards of #72 already carry.
 */
export function copyNerdsShards(publicData: string, fingerprint: string, env: Record<string, string | undefined> = process.env, cwd = process.cwd()): number {
  const source = resolve(dataDir(env, cwd), 'nerds')
  const target = resolve(publicData, `v${fingerprint}`, 'nerds')
  rmSync(target, { recursive: true, force: true })
  if (!existsSync(source)) return 0
  let copied = 0
  for (const level of ['regiao', 'uf']) {
    if (!existsSync(resolve(source, level))) continue
    cpSync(resolve(source, level), resolve(target, level), { recursive: true, filter: () => (copied++, true) })
  }
  return copied
}
