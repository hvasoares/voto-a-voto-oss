import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createNodeStore } from '../src/data/node'
import { displayName } from '../src/shared/city-search'
import { collectRequests, violations, waitReady } from './helpers'

/*
 * Real-data checks. Run with `npm run test:real` (builds with DATA_DIR=../data). Skipped when ../data is missing.
 * Samples: first and last city, the 2026-only Boa Esperança do Norte, an overseas post, a non-ASCII name.
 */
const dir = resolve('../data')
const present = existsSync(resolve(dir, 'cities.csv'))
const cities = present ? await createNodeStore(dir).cities() : []
const pick = (f: (c: (typeof cities)[number]) => boolean) => cities.find(f)
const samples = [
  cities[0], cities[cities.length - 1],
  pick((c) => c.slug === 'boa-esperanca-do-norte'),
  pick((c) => c.uf === 'zz'),
  pick((c) => c.uf !== 'zz' && /[^\x00-\x7f]/.test(c.nome)),
].filter((c): c is NonNullable<typeof c> => !!c)
const subs = ['', 'compartilhar/', 'qr/', 'tres-ciclos/']

test.skip(!present, 'no ../data')
for (const c of samples) {
  for (const sub of subs) {
    const path = `/${c.uf}/${c.slug}/${sub}`
    test(`real ${path} (${c.nome})`, async ({ page, baseURL }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      const seen = collectRequests(page)
      expect((await page.goto(path))?.status()).toBe(200)
      await waitReady(page)
      await page.waitForLoadState('networkidle')
      if (sub === '') await expect(page.locator('h1')).toHaveText(displayName(c.nome))
      if (sub === '') await expect(page.locator('[data-not-hydrated]')).toHaveCount(0)
      else await expect(page.locator('[data-not-hydrated]')).toBeVisible()
      expect(errors).toEqual([])
      expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
      const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
      expect(sw).toBeLessThanOrEqual(iw)
    })
  }
}

test('the 404.html fallback works with the real dataset (client loads the real CSVs)', async ({ page }) => {
  await page.goto('/rj/rj-inexistente/')
  await waitReady(page)
  await expect(page.locator('[data-not-found]')).toBeVisible()
})

/* ---- state (#4): every state page against cities.csv ---- */
const byUf = new Map<string, number>()
for (const c of cities) if (c.uf !== 'zz') byUf.set(c.uf, (byUf.get(c.uf) ?? 0) + 1)

test.describe('state pages on the real dataset', () => {
  test('there are 27 states and every one lists exactly the cities of cities.csv, as anchors to existing city pages', async ({ page, baseURL }) => {
    expect(byUf.size).toBe(27)
    for (const [uf, n] of byUf) {
      await page.goto(`/${uf}/`)
      await waitReady(page)
      await expect(page.locator('h1')).toHaveText(`Estado selecionado: ${uf.toUpperCase()}`)
      await expect(page.locator('.page__subtitle')).toHaveText(n === 1 ? "1 município" : `${n} municípios`)
      expect(await page.locator('[data-state-list] a.state-row').count(), uf).toBe(n)
      const hrefs = await page.locator('[data-state-list] a.state-row').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
      expect(new Set(hrefs).size, uf).toBe(n)
      expect(hrefs.every((h) => h.startsWith(`/${uf}/`))).toBe(true)
    }
  })

  test('RJ shows 92 and SP 645; the list is plain anchors without JavaScript', async ({ page, browser }) => {
    expect(byUf.get('rj')).toBe(92)
    expect(byUf.get('sp')).toBe(645)
    await page.goto('/rj/')
    await waitReady(page)
    await expect(page.locator('.page__subtitle')).toHaveText('92 municípios')
    const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL: page.url().replace(/\/rj\/$/, '') })
    const plain = await ctx.newPage()
    await plain.goto('/sp/')
    await expect(plain.locator('[data-state-list] a.state-row')).toHaveCount(645)
    await ctx.close()
  })

  test('sampled links resolve to the right city page', async ({ page, baseURL }) => {
    await page.goto('/sp/')
    await waitReady(page)
    const hrefs = await page.locator('[data-state-list] a.state-row').evaluateAll((els) => els.filter((_, i) => i % 40 === 0).map((e) => e.getAttribute('href')!))
    expect(hrefs.length).toBeGreaterThan(10)
    for (const h of hrefs) expect((await page.request.get(new URL(h, baseURL!).toString())).status(), h).toBe(200)
    const first = page.locator('[data-state-list] a.state-row').first()
    const href = await first.getAttribute('href')
    await first.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
  })

  test('scoped search returns only cities of that state, ignoring accents', async ({ page }) => {
    await page.goto('/sp/')
    await waitReady(page)
    await page.getByRole('searchbox').fill('sao')
    await expect(page.locator('[data-state-results] a.state-row').first()).toBeVisible()
    const hrefs = await page.locator('[data-state-results] a.state-row').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
    expect(hrefs.length).toBeGreaterThan(5)
    expect(hrefs.every((h) => h.startsWith('/sp/'))).toBe(true)
    await page.getByRole('searchbox').fill('belem')
    await expect(page.getByText('Nenhuma cidade encontrada em SP.')).toBeVisible()
    await page.goto('/pa/')
    await waitReady(page)
    await page.getByRole('searchbox').fill('belem')
    await expect(page.locator('[data-state-results] a.state-row').first()).toContainText('Belém')
  })

  test('overseas has no state page', async ({ page }) => {
    expect((await page.goto('/zz/'))?.status()).toBe(404)
  })

  test('the largest state makes no foreign request and does not scroll sideways', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto('/sp/')
    await waitReady(page)
    await page.getByRole('searchbox').fill('campinas')
    await page.waitForLoadState('networkidle')
    expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
  })
})

/* ---- home (#3): search over the real 5,760 cities ---- */
const results = (page: import('@playwright/test').Page) => page.locator('a.home-result').evaluateAll((els) => els.map((e) => e.textContent!.trim()))

test.describe('home search on the real dataset', () => {
  test('finds cities typed without accents, with their UF', async ({ page }) => {
    await page.goto('/')
    await waitReady(page)
    const box = page.getByRole('searchbox')
    for (const [typed, first] of [['sao paulo', 'São PauloSP'], ['brasilia', 'BrasíliaDF'], ['Belém', 'BelémAL']] as const) {
      await box.fill(typed)
      await expect(page.locator('a.home-result').first()).toBeVisible()
      const found = await results(page)
      expect(found, typed).toContain(first)
    }
  })

  test('shows every state of a name that exists in several states', async ({ page }) => {
    await page.goto('/')
    await waitReady(page)
    await page.getByRole('searchbox').fill('belem')
    await expect(page.locator('a.home-result').first()).toBeVisible()
    const found = await results(page)
    for (const uf of ['AL', 'PA', 'PB']) expect(found).toContain(`Belém${uf}`)
    await page.getByRole('searchbox').fill('bom jesus')
    const bj = await page.locator('a.home-result .home-result__uf').allTextContents()
    expect(new Set(bj).size).toBeGreaterThanOrEqual(5)
  })

  test('opens the right city from a result', async ({ page }) => {
    await page.goto('/')
    await waitReady(page)
    await page.getByRole('searchbox').fill('sao paulo')
    await page.locator('a.home-result', { hasText: 'SP' }).first().click()
    await expect(page).toHaveURL(/\/sp\/sao-paulo\/$/)
  })

  test('all 27 state tiles link to an existing state page; overseas is not a state', async ({ page, baseURL }) => {
    await page.goto('/')
    await waitReady(page)
    const hrefs = await page.locator('a.uf-tile').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
    expect(hrefs).toHaveLength(27)
    expect(hrefs).not.toContain('/zz/')
    for (const h of hrefs) expect((await page.request.get(new URL(h, baseURL!).toString())).status(), h).toBe(200)
  })

  test('typing makes no request beyond the site own cities.csv, and answers fast', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto('/')
    await waitReady(page)
    const box = page.getByRole('searchbox')
    await box.focus()
    await box.fill('sa')
    await expect(page.locator('a.home-result').first()).toBeVisible()
    // latency of one search + render over all cities, measured inside the page
    const ms = await page.evaluate(async () => {
      const input = document.querySelector<HTMLInputElement>('.home-search__input')!
      const box = document.querySelector('[data-home-results]')!
      const times: number[] = []
      for (const q of ['sao', 'sao paulo', 'belem', 'bom jesus', 'santa luzia', 'a', 'brasilia']) {
        const t0 = performance.now()
        const done = new Promise<void>((r) => new MutationObserver((_, o) => (o.disconnect(), r())).observe(box, { childList: true, subtree: true }))
        input.value = q
        input.dispatchEvent(new Event('input'))
        await done
        times.push(performance.now() - t0)
      }
      return times
    })
    console.log('search latency ms (7 queries, 5,760 cities):', ms.map((m) => m.toFixed(1)).join(' '))
    expect(Math.max(...ms)).toBeLessThan(250)
    await page.waitForLoadState('networkidle')
    expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
    const files = seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/'))
    expect(files.every((p) => p.endsWith('/cities.csv') || p.endsWith('/manifest.json'))).toBe(true)
  })
})

/* ---- city card (#5): shown numbers against values computed here from turnout.csv and votes.csv ---- */
type T = { aptos: number; comparecimento: number; brancos: number; nulos: number; anulados: number; validos: number }
const rows = (file: string) => (present ? readFileSync(resolve(dir, file), 'utf8').trim().split('\n').slice(1).map((l) => l.split(',')) : [])
const turnoutOf = new Map<string, T>()
for (const r of rows('turnout.csv')) turnoutOf.set(`${r[0]}|${r[1]}|${r[2]}|${r[3]}`, { aptos: +r[4]!, comparecimento: +r[5]!, brancos: +r[7]!, nulos: +r[8]!, anulados: +r[9]!, validos: +r[10]! })
const votesOf = new Map<string, Map<number, number>>()
for (const r of rows('votes.csv')) {
  const k = `${r[0]}|${r[1]}|${r[2]}|${r[3]}`
  if (!votesOf.has(k)) votesOf.set(k, new Map())
  votesOf.get(k)!.set(+r[4]!, +r[5]!)
}
const key = (c: (typeof cities)[number], ano: number, turno: number) => `${ano}|${turno}|${c.uf}|${c.cdMunicipio}`
const dot = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
/** Independent largest-remainder (written here, not imported). */
function lr(parts: number[]): number[] {
  const sum = parts.reduce((a, b) => a + b, 0)
  if (!sum) return parts.map(() => 0)
  const exact = parts.map((p) => (p * 100) / sum)
  const out = exact.map(Math.floor)
  let left = 100 - out.reduce((a, b) => a + b, 0)
  exact.map((e, i) => [e - out[i]!, i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => left-- > 0 && out[i]!++)
  return out
}
const sao = pick((c) => c.uf === 'sp' && c.slug === 'sao-paulo')
const domestic = cities.filter((c) => c.uf !== 'zz')
const tiny = domestic.filter((c) => turnoutOf.has(key(c, 2026, 2))).sort((a, b) => turnoutOf.get(key(a, 2026, 2))!.aptos - turnoutOf.get(key(b, 2026, 2))!.aptos)[0]
const tops = (c: (typeof cities)[number], ano: number, turno: number) => [...(votesOf.get(key(c, ano, turno)) ?? new Map()).values()].sort((a, b) => b - a)
let tie: (typeof cities)[number] | undefined
let near: (typeof cities)[number] | undefined
let nearGap = Infinity
for (const c of domestic) {
  const [x, y] = tops(c, 2022, 1)
  if (x === undefined || y === undefined) continue
  if (x === y && !tie) tie = c
  if (x !== y && x - y < nearGap && x > 1000) (nearGap = x - y), (near = c)
}
const noTurnout = cities.find((c) => c.uf === 'zz' && turnoutOf.get(key(c, 2018, 1))?.comparecimento === 0 && turnoutOf.get(key(c, 2018, 1))!.aptos > 0)
const cardSamples = [
  [sao, 2026, 2], [sao, 2026, 1], [sao, 2018, 1], [tiny, 2026, 2], [tiny, 2022, 1], [tie, 2022, 1], [near, 2022, 1],
  [noTurnout, 2018, 1], [pick((c) => c.slug === 'boa-esperanca-do-norte'), 2026, 2], [pick((c) => c.slug === 'boa-esperanca-do-norte'), 2026, 1],
  [pick((c) => c.uf !== 'zz' && /[^\x00-\x7f]/.test(c.nome) && c.slug !== 'sao-paulo'), 2026, 1],
] as const

test.describe('city card on the real dataset', () => {
  test('samples exist', () => {
    for (const s of [sao, tiny, tie, near, noTurnout]) expect(s).toBeDefined()
  })
  for (const [c, ano, turno] of cardSamples) {
    if (!c) continue
    test(`${c.uf}/${c.slug} ${ano} round ${turno}: shown numbers equal the CSVs, parts add up to 100`, async ({ page, baseURL }) => {
      const seen = collectRequests(page)
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(`/${c.uf}/${c.slug}/?ciclo=${ano}&turno=${turno}`)
      await waitReady(page)
      await page.waitForLoadState('networkidle')
      const t = turnoutOf.get(key(c, ano, turno))!
      const panel = page.locator('[data-city-card] [data-view]:not([hidden])')
      await expect(page.locator('h1')).toHaveText(displayName(c.nome))
      const naoVotaram = t.aptos - t.validos
      const [votedPct, notPct] = lr([t.validos, naoVotaram])
      expect(votedPct + notPct).toBe(t.aptos ? 100 : 0)
      const titles = await panel.locator('.turnout__title').allInnerTexts()
      expect(titles.map((x) => x.replace(/\s+/g, ' '))).toEqual([`Votaram · ${votedPct}% do eleitorado`, `Não votaram · ${notPct}% do eleitorado`])
      const legend = await panel.locator('.legend__row .legend__value').allInnerTexts()
      const kinds = await panel.locator('.legend__row').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.kind))
      const shown = Object.fromEntries(kinds.map((k, i) => [k, legend[i]!.replace(/\s+/g, ' ')]))
      const sorted = [...(votesOf.get(key(c, ano, turno)) ?? new Map<number, number>()).values()].sort((a, b) => b - a)
      const resto = Math.max(naoVotaram - t.brancos - t.nulos - t.anulados, 0)
      const nulos = t.nulos + t.anulados
      const nv = lr([resto, t.brancos, nulos])
      expect(shown.abstencao).toBe(`${dot(resto)} · ${nv[0]}% dos que não votaram`)
      expect(shown.brancos).toBe(`${dot(t.brancos)} · ${nv[1]}% dos que não votaram`)
      expect(shown.nulos).toBe(`${dot(nulos)} · ${nv[2]}% dos que não votaram`)
      // candidates: the votes shown for A and B are the two largest in the file
      expect(shown.a!.startsWith(`${dot(sorted[0] ?? 0)} · `)).toBe(true)
      expect(shown.b!.startsWith(`${dot(sorted[1] ?? 0)} · `)).toBe(true)
      const pcts = (await panel.locator('.legend__row').allInnerTexts()).map((x) => Number(/·\s*(\d+)%/.exec(x.replace(/\s+/g, ' '))![1]))
      const voted = pcts.slice(0, kinds.indexOf('abstencao'))
      expect(voted.reduce((a, b) => a + b, 0)).toBe(t.validos ? 100 : 0)
      expect(pcts.slice(kinds.indexOf('abstencao')).reduce((a, b) => a + b, 0)).toBe(naoVotaram ? 100 : 0)
      const outros = sorted.slice(2).reduce((a, b) => a + b, 0)
      if (kinds.includes('outros')) expect(shown.outros!.startsWith(`${dot(outros)} · `)).toBe(true)
      else expect(sorted.length).toBeLessThanOrEqual(2)
      await expect(panel.locator('.city-takeaway')).toContainText(`no ${turno}º turno de ${ano}`)
      expect(errors).toEqual([])
      expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
      const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
      expect(sw).toBeLessThanOrEqual(iw)
    })
  }

  test('Sao Paulo 2026 round 2 shows Lula and Flavio Bolsonaro votes exactly as in the dataset', async ({ page }) => {
    await page.goto('/sp/sao-paulo/')
    await waitReady(page)
    const v = votesOf.get(key(sao!, 2026, 2))!
    const text = await page.locator('[data-city-card] [data-view]:not([hidden]) .legend').innerText()
    expect(text.replace(/\s+/g, ' ')).toContain(`Lula ${dot(v.get(13)!)} ·`)
    expect(text.replace(/\s+/g, ' ')).toContain(`Flavio Bolsonaro ${dot(v.get(22)!)} ·`)
    expect(v.get(13)).toBe(3864354)
  })

  test('the overseas post without turnout says nobody turned out and shows the whole electorate as not voting', async ({ page }) => {
    await page.goto(`/${noTurnout!.uf}/${noTurnout!.slug}/?ciclo=2018&turno=1`)
    await waitReady(page)
    const t = turnoutOf.get(key(noTurnout!, 2018, 1))!
    await expect(page.locator('.city-takeaway:visible')).toContainText(`nenhum dos ${dot(t.aptos)} eleitores aptos compareceu`)
    await expect(page.locator('.turnout__title:visible').first()).toContainText('Votaram · 0% do eleitorado')
  })

  test('Boa Esperança do Norte: only 2026 has data; 2018 and 2022 say so, both rounds of 2026 render', async ({ page }) => {
    await page.goto('/mt/boa-esperanca-do-norte/?ciclo=2018&turno=1')
    await waitReady(page)
    await expect(page.locator('[data-nodata]:visible')).toHaveText('Sem dados nesse ciclo.')
    await page.goto('/mt/boa-esperanca-do-norte/')
    await waitReady(page)
    await expect(page.locator('.turnout:visible')).toHaveCount(1)
    await page.getByRole('link', { name: '1º turno' }).click()
    await expect(page.locator('.city-takeaway:visible')).toContainText('no 1º turno de 2026')
  })

  test('the card renders for both rounds of every sampled city without a foreign request', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    for (const c of [sao, tiny, tie]) {
      for (const turno of [1, 2]) {
        await page.goto(`/${c!.uf}/${c!.slug}/?turno=${turno}`)
        await waitReady(page)
        await expect(page.locator('.turnout:visible')).toHaveCount(1)
      }
    }
    expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
  })
})
