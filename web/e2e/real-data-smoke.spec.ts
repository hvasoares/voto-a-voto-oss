import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'
import { dataGuard } from './presets'

/*
 * LAUNCH GATE (issue #21), criteria 1 and 3, on the REAL build. Run with `npm run test:real`
 * (builds with DATA_DIR=../data). Two gates:
 *
 * 1. Full coverage (filesystem, no HTTP): EVERY index.html of the built site exists and is non-empty;
 *    the smoke sample is derived from the same walk.
 * 2. Smoke sample (deterministic): every /mapa/<uf>, every /<uf>, all /relatorios/* + /comparar/*,
 *    the map hub and map/virada, /brasil/, /sobre-os-dados/, a stratified city sample (the first and
 *    the last slug alphabetically of every UF), the qr/compartilhar/tres-ciclos sub-routes of one
 *    city, both demos and home. For each: HTTP 200, no pageerror, no console error, and (criterion 3)
 *    every request of the route's network trace is a same-origin GET (this build has no analytics id
 *    and an empty cdn.config.json, so the site origin is the only legitimate origin — anything else
 *    fails the #48 network rule enforced by violations()).
 *
 * The full trace of the sample (per-route request counts, status and request types) is written to
 * .captures/launch-gate/network-trace.json for the record in web/docs/launch-gate.md.
 */
test.skip(...dataGuard())

const DIST = resolve(process.env.OUT_DIR ?? 'dist')

/** Every directory of the build that has an index.html, as the URL path under `base` (plus 404.html). */
function builtRoutes(): string[] {
  const routes: string[] = []
  const walk = (dir: string) => {
    if (existsSync(join(dir, 'index.html'))) routes.push(base + relative(DIST, dir).replaceAll('\\', '/') + '/')
    for (const child of readdirSync(dir).filter((c) => statSync(join(dir, c)).isDirectory()).sort()) walk(join(dir, child))
  }
  walk(DIST)
  return routes
}

/** The deterministic smoke sample (criterion 1). City routes: 2 per UF (first and last slug alphabetically). */
function sampleRoutes(routes: string[]): string[] {
  const cityRoutes = routes.filter((r) => new RegExp(`^${base}\\w{2}/[a-z0-9-]+/$`).test(r))
  const byUf = new Map<string, string[]>()
  for (const r of cityRoutes) byUf.set(r.slice(base.length, base.length + 2), [...(byUf.get(r.slice(base.length, base.length + 2)) ?? []), r])
  const citySample = [...byUf.entries()].sort().flatMap(([, slugs]) => [slugs[0]!, slugs[slugs.length - 1]!])
  const sub = ['sp/sao-paulo/qr/', 'sp/sao-paulo/compartilhar/', 'sp/sao-paulo/tres-ciclos/']
  return [
    base,
    `${base}mapa/`, `${base}mapa/virada/`, `${base}brasil/`, `${base}sobre-os-dados/`, `${base}relatorios/`,
    ...routes.filter((r) => r.startsWith(`${base}relatorios/`) && r !== `${base}relatorios/`),
    `${base}comparar/2022/`, `${base}comparar/2018/`,
    ...routes.filter((r) => new RegExp(`^${base}mapa/\\w{2}/$`).test(r)),
    ...routes.filter((r) => new RegExp(`^${base}\\w{2}/$`).test(r)),
    ...citySample,
    ...sub.map((s) => base + s),
    `${base}qr/`, `${base}compartilhar/`,
  ]
}

interface Trace {
  route: string
  status: number | null
  requests: number
  requestTypes: Record<string, number>
}

test.describe.serial('launch gate: smoke over the built real site (issue #21)', () => {
  /** Collected beforeAll: the route list lives in the build, which is only ready when the server is. */
  const state: { routes: string[]; traces: Trace[]; pageErrors: string[]; consoleErrors: { route: string; text: string }[]; total: number } = {
    routes: [], traces: [], pageErrors: [], consoleErrors: [], total: 0,
  }

  test.beforeAll(() => {
    state.routes = sampleRoutes(builtRoutes())
  })

  test('full coverage (filesystem, no HTTP): every built index.html exists and is non-empty', () => {
    const all = builtRoutes()
    for (const route of all) {
      const file = join(DIST, route.slice(base.length), 'index.html')
      expect(statSync(file).size, route).toBeGreaterThan(500)
      expect(readFileSync(file, 'utf8'), route).toContain('</html>')
    }
    // the real build is ~23k city pages (5,760 x card/share/qr/tres-ciclos) plus the rest of the site
    expect(all.length).toBeGreaterThan(23_000)
    // ...and the layers the smoke sample needs are all really there
    for (const route of ['sp/sao-paulo/', 'sp/sao-paulo/qr/', 'mapa/sp/', 'relatorios/comparecimento/', 'comparar/2022/', 'qr/', 'compartilhar/']) {
      expect(all, route).toContain(`${base}${route}`)
    }
  })

  test('every sampled route is 200 with no pageerror, no console error and only same-origin GETs (network trace)', async ({ page, baseURL }) => {
    test.setTimeout(420_000) // ~125 routes x (networkidle on each) in one serial test
    expect(state.routes.length).toBeGreaterThanOrEqual(100)
    const allowed = await allowedOrigins(new URL(baseURL!).origin)
    // criterion 3, tightened: the trace may contain NOTHING but the site's own origin (the analytics
    // allow-list is empty (no id is configured in this build; the CDN list is empty)
    expect(allowed).toEqual([new URL(baseURL!).origin])
    page.on('pageerror', (e) => state.pageErrors.push(String(e)))
    page.on('console', (m) => {
      if (m.type() === 'error') state.consoleErrors.push({ route: page.url(), text: m.text() })
    })
    for (const route of state.routes) {
      const seen = collectRequests(page)
      const response = await page.goto(route, { waitUntil: 'networkidle' })
      const status = response?.status() ?? null
      state.total += seen.length
      state.traces.push({ route, status, requests: seen.length, requestTypes: typesOf(seen) })
      expect(status, route).toBe(200)
      expect(violations(seen, allowed), route).toEqual([])
    }
    expect(state.pageErrors, state.pageErrors.join('\n')).toEqual([])
    expect(state.consoleErrors, JSON.stringify(state.consoleErrors.slice(0, 12), null, 2)).toEqual([])
    // the trace record for launch-gate.md (criterion 3)
    const dir = resolve('.captures', 'launch-gate')
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, 'network-trace.json'), JSON.stringify({
      built: 'DATA_DIR=../data npm run build (local bundle; no analytics id, cdn.config.json empty)',
      note: 'Every request of every route in the smoke sample: GET to the site origin only. The per-route counts are listed in traces[].',
      sampleSize: state.routes.length,
      totalRequests: state.total,
      originsSeen: ['the site origin (localhost, E2E_PORT) — the only origin in the allow-list of this build'],
      traces: state.traces,
    }, null, 2) + '\n')
  })
})

function typesOf(seen: { method: string; type: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of seen) out[r.type] = (out[r.type] ?? 0) + 1
  return out
}