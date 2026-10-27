import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * The static method page (/sobre-os-dados/), ticket #18. The page is pre-rendered Astro markup with
 * no island: plain-Portuguese sections (source, method, checks, limits, privacy, licensing), the
 * manifest table and the GitHub link. The fixture build shows the same page as the real build: the
 * figures are pinned to data/manifest.json by src/lib/about-data.test.ts, not read from DATA_DIR.
 */
const path = base + 'sobre-os-dados/'

const SECTIONS = [
  'De onde vêm os números',
  'Como os números do site são calculados',
  'O que foi conferido',
  'O que ainda não temos',
  'Limites',
  'Confira você mesmo',
  'Código aberto',
  'Fontes e licença',
  'Privacidade',
]

test.describe('sobre os dados page', () => {
  test('carries every section of the ticket', async ({ page }) => {
    await page.goto(path)
    await expect(page, 'h1').toHaveTitle(/Sobre os dados/)
    await expect(page.locator('#main h1')).toHaveText('Sobre os dados')
    for (const heading of SECTIONS) await expect(page.locator('#main h2').filter({ hasText: heading }), heading).toHaveCount(1)
    await expect(page.locator('footer[data-component="source-footer"]')).toHaveText('Fonte: TSE, dados finais')
  })

  test('backs to the home page and links the GitHub repo without leaving the page', async ({ page }) => {
    await page.goto(path)
    const back = page.locator('#main').getByRole('link', { name: '‹ Início' })
    await expect(back).toHaveAttribute('href', base)
    const repo = page.getByRole('link', { name: 'github.com/hvasoares/voto-a-voto' })
    await expect(repo).toHaveAttribute('href', 'https://github.com/hvasoares/voto-a-voto')
       const manifestLink = page.getByRole('link', { name: 'manifesto do repositório' })
    await expect(manifestLink).toHaveAttribute('href', 'https://github.com/hvasoares/voto-a-voto/blob/main/data/manifest.json')
  })

  test('defines margin, swing, valid votes and cohorts in plain Portuguese', async ({ page }) => {
    await page.goto(path)
    const list = page.locator('#calculo + ul')
    await expect(list).toBeVisible()
    const definitions = await list.locator('li').allTextContents()
    expect(definitions).toHaveLength(7)
    expect(definitions.some((d) => d.includes('pontos percentuais'))).toBe(true)
    expect(definitions.some((d) => d.includes('Votos válidos'))).toBe(true)
    expect(definitions.some((d) => d.includes('Grupos'))).toBe(true)
  })

  test('shows the manifest sources with bytes, date and hash recorded', async ({ page }) => {
    await page.goto(path)
    const entries = page.locator('[data-component="manifest-list"] [data-source]')
    await expect(entries).toHaveCount(5)
    const source2018 = entries.filter({ hasText: 'votacao_candidato_munzona_2018.zip' })
    await expect(source2018).toHaveCount(1)
    await expect(source2018).toContainText('Coleta (UTC): 26/10/2026 21:55')
    await expect(source2018).toContainText('395.389.280 bytes')
    await expect(source2018).toContainText('SHA-256: f880848ef4ba…')
    const results2026 = entries.filter({ hasText: 'resultados.tse.jus.br/oficial/ele2026' })
    await expect(results2026).toContainText('11.517 arquivos · 11.516 finais')
    await expect(results2026).toContainText('digest dos arquivos: 62db05bd3b2b…')
    await expect(page.locator('[data-source]', { hasText: 'SHA-256' }).filter({ hasText: 'detalhe_votacao_munzona_2022.zip' })).toContainText('4.429.327 bytes')
  })

  test('states the extension window is not in this version and what that means', async ({ page }) => {
    await page.goto(path)
    const section = page.locator('section[aria-labelledby="pendencias"]')
    await expect(section).toContainText('Relatório da janela de extensão de horário de votação')
    await expect(section).toContainText('não entra nesta versão')
  })

  test('keeps the privacy section free of promises the site cannot keep yet: no data sent, consent needed', async ({ page }) => {
    await page.goto(path)
    const section = page.locator('section[aria-labelledby="privacidade"]')
    await expect(section).toContainText('não é enviado')
    await expect(section).toContainText('consentimento')
    await expect(section).toContainText('recusar')
  })

  test('is reachable from the home footer and only asks the site itself', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base)
    await page.locator('footer[data-component="source-footer"]').getByRole('link', { name: 'Sobre os dados' }).click()
    await expect(page).toHaveURL(new RegExp(`${base}sobre-os-dados/$`))
    await expect(page.locator('#main h1')).toBeVisible()
    const allowed = await allowedOrigins(baseURL!)
    expect(violations(seen, allowed)).toEqual([])
  })
})