/**
 * Static build. Output: dist/ (served as-is by GitHub Pages).
 *   SITE_BASE  base path, default "/"  (GitHub Pages project site: "/voto-a-voto/")
 *   DATA_DIR   dataset directory, default "fixtures/data" (real data: "../data")
 *   OUT_DIR    output directory, default "dist"
 */
import { build } from 'esbuild'
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { enumerateRoutes } from '../src/app'
import { createNodeStore, dataDir } from '../src/data/node'
import { DATA_FILES } from '../src/data/types'
import { notFoundPage } from '../src/not-found'
import { normalizeBase, withBase } from '../src/paths'
import { shell } from '../src/shell'
import { makeHref, type SlotContext } from '../src/shared/slot'
import { noopAnalytics } from '../src/analytics'
import { tokensCss } from '../src/shared/tokens'
import { slots } from '../src/slots/registry'

export async function buildSite(env: NodeJS.ProcessEnv = process.env, root = process.cwd()) {
  const base = normalizeBase(env.SITE_BASE)
  const out = resolve(root, env.OUT_DIR ?? 'dist')
  const dir = dataDir(env, root)
  for (const f of DATA_FILES) {
    if (!existsSync(resolve(dir, f))) throw new Error(`DATA_DIR ${dir} is missing ${f}`)
  }

  await rm(out, { recursive: true, force: true })
  await mkdir(resolve(out, 'assets'), { recursive: true })

  await build({
    entryPoints: [resolve(root, 'src/client/main.ts')],
    outfile: resolve(out, 'assets/app.js'),
    bundle: true,
    format: 'esm',
    target: 'es2020',
    minify: true,
  })
  const baseCss = await readFile(resolve(root, 'src/shared/base.css'), 'utf8')
  await writeFile(resolve(out, 'assets/app.css'), tokensCss() + baseCss)

  await mkdir(resolve(out, 'data'), { recursive: true })
  for (const f of DATA_FILES) await copyFile(resolve(dir, f), resolve(out, 'data', f))

  const data = createNodeStore(dir)
  const routes = await enumerateRoutes(slots, data)
  for (const r of routes) {
    const ctx: SlotContext = {
      base,
      params: r.params,
      query: new URLSearchParams(),
      data,
      analytics: noopAnalytics,
      useFrameFixture: false,
      href: makeHref(base, r.params),
    }
    const page = await r.slot.render(ctx)
    const file = resolve(out, r.path.slice(1), 'index.html')
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, shell({ base, title: page.title, body: page.html.value, slotId: r.slot.meta.id, route: r.path }))
  }

  // GitHub Pages serves 404.html for any path without a file. The client script re-resolves the path
  // and renders the right screen for a valid route that was not pre-rendered (e.g. a city added later).
  const nf = notFoundPage(base)
  await writeFile(resolve(out, '404.html'), shell({ base, title: nf.title, body: nf.html.value, slotId: '', route: '' }))
  await writeFile(resolve(out, '.nojekyll'), '')
  await writeFile(
    resolve(out, 'routes.json'),
    JSON.stringify({ base, dataDir: dir, routes: routes.map((r) => ({ slot: r.slot.meta.id, path: withBase(base, r.path) })) }, null, 1) + '\n',
  )
  return { out, base, pages: routes.length }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { pages, out, base } = await buildSite()
  console.log(`built ${pages} pages + 404.html into ${out} (base ${base}, data ${dataDir()})`)
}
