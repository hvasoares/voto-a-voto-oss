import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * The static method page (/sobre-os-dados/), ticket #18. The page is pre-rendered Astro markup with
 * no island: plain-Portuguese sections (source, method, checks, limits, privacy, licensing), the
 * manifest table and the GitHub link. The fixture build shows the same page as the real build: the
 * figures are pinned to data/manifest.json by src/lib/about-data.test.ts, not read from DATA_DIR.
 */
const path = base + 'sobre-os-dados/'

/** The five task sections in the visitor's order (#98): stable public anchors, do not rename. */
const TASKS = [
  { id: 'e-final', heading: 'Este resultado é final?' },
  { id: 'qual-edicao', heading: 'Qual edição estou vendo?' },
  { id: 'de-onde-vem', heading: 'De onde vêm os números' },
  { id: 'confira-voce-mesmo', heading: 'Confira você mesmo' },
  { id: 'como-citar', heading: 'Como citar uma edição' },
]

/** Every heading the page had before #98: its id (kept, linked from other pages) and the task section it now sits in. */
const OLD_HEADINGS = [
  { text: 'De onde vêm os números', id: 'de-onde-vem', in: 'de-onde-vem' },
  { text: 'Como os números do site são calculados', id: 'calculo', in: 'de-onde-vem' },
  { text: 'O que foi conferido', id: 'conferido', in: 'confira-voce-mesmo' },
  { text: 'O que ainda não temos', id: 'pendencias', in: 'de-onde-vem' },
  { text: 'Limites', id: 'limites', in: 'de-onde-vem' },
  { text: 'Confira você mesmo', id: 'confira', in: 'confira-voce-mesmo' },
  { text: 'Edições dos dados', id: 'edicoes', in: 'qual-edicao' },
  { text: 'Final, não ao vivo', id: 'final-nao-ao-vivo', in: 'e-final' },
  { text: 'Dados abertos de cada edição', id: 'dados-abertos', in: 'qual-edicao' },
  { text: 'Como citar uma edição', id: 'como-citar', in: 'como-citar' },
  { text: 'Para jornalistas e associações', id: 'jornalistas', in: 'usar-os-dados' },
  { text: 'Código aberto', id: 'codigo', in: 'codigo' },
  { text: 'Fontes e licença', id: 'licenca', in: 'de-onde-vem' },
  { text: 'Licenças do código e dos dados', id: 'licencas', in: 'licencas' },
  { text: 'Privacidade', id: 'privacidade', in: 'privacidade' },
  { text: 'O que fica guardado no seu aparelho', id: 'guardado-no-aparelho', in: 'privacidade' },
]

/** The seven ways to use the data outside the site (#102): data-use key, the page it reaches (path from the site root, `{id}` is the edition the page itself shows). */
const USES = [
  { key: 'widget', to: 'widget/', h1: /widget|Widget|Montar/ },
  { key: 'imprensa', to: 'imprensa/', h1: 'Para a imprensa' },
  { key: 'dados-abertos', to: 'edicoes/{id}/#dados-abertos', h1: /Edição|ediç/i },
  { key: 'api', to: 'api/', h1: 'API de dados abertos' },
  { key: 'dados-para-nerds', to: 'dados-para-nerds/', h1: /Brasil|nerds/ },
  { key: 'feed', to: 'edicoes/feed.atom', h1: '' },
  { key: 'fale-sem-errar', to: 'fale-sem-errar/', h1: 'Fale sem errar' },
]

test.describe('sobre os dados page', () => {
  test('carries every section of the ticket', async ({ page }) => {
    await page.goto(path)
    await expect(page, 'h1').toHaveTitle(/Sobre os dados/)
    await expect(page.locator('#main h1')).toHaveText('Sobre os dados')
    for (const { heading } of TASKS) await expect(page.locator('#main h2').filter({ hasText: heading }), heading).toHaveCount(1)
    await expect(page.locator('footer[data-component="source-footer"]')).toContainText('Fonte: TSE, dados finais')
  })

  test('the five task sections come first, in the visitor\'s order, each with its stable anchor', async ({ page }) => {
    await page.goto(path)
    const h2s = await page.locator('#main h2').evaluateAll((els) => els.map((e) => ({ id: e.id, text: e.textContent })))
    expect(h2s.slice(0, 5)).toEqual(TASKS.map((t) => ({ id: t.id, text: t.heading })))
    for (const t of TASKS) {
      await page.goto(`${path}#${t.id}`)
      await expect(page.locator(`#${t.id}`)).toBeInViewport()
    }
  })

  test('no heading or anchor of the old page was lost: each old heading is found, and its old address lands in the right section', async ({ page }) => {
    await page.goto(path)
    const text = await page.locator('#main').innerText()
    for (const old of OLD_HEADINGS) {
      // the old id still exists and lies inside the task section that now holds it
      const holder = page.locator(`section[aria-labelledby="${old.in}"]`)
      await expect(holder.locator(`#${old.id}`), `#${old.id}`).toHaveCount(1)
      // the old heading text is still on the page, except "Edições dos dados", which became the question "Qual edição estou vendo?"
      if (old.text !== 'Edições dos dados') expect(text, old.text).toContain(old.text)
    }
  })

  test('the licence, the stored items, the no-ads line and the sources are still on the page', async ({ page }) => {
    await page.goto(path)
    const main = page.locator('#main')
    await expect(main).toContainText('Código: licença MIT')
    await expect(main).toContainText('Creative Commons Atribuição 4.0 (CC BY 4.0)')
    await expect(main.locator('[data-component="stored-items"] li').first()).toBeVisible()
    await expect(main.locator('[data-support-text]')).toHaveText('Doações e análise de uso são separadas. Não há anúncios em nenhuma página.')
    await expect(main.locator('[data-component="manifest-list"] [data-source]')).toHaveCount(6)
    await expect(main.locator('[data-component="citation"]')).toContainText('ediç')
    await expect(main.getByRole('heading', { level: 2, name: 'Confira você mesmo' }).locator('xpath=..').getByRole('listitem')).not.toHaveCount(0)
  })

  test('the "Final, não ao vivo" chip sits in the page footer, right above the edition line, and shows without scripts', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(path)
    const chip = page.locator('footer[data-component="source-footer"] [data-component="final-chip"]')
    await expect(chip).toBeVisible()
    await expect(chip).toHaveText('Final, não ao vivo')
    const [c, e] = await Promise.all([chip.boundingBox(), page.locator('[data-edition-link]').boundingBox()])
    expect(e!.y - (c!.y + c!.height)).toBeLessThan(40)
    expect(await chip.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13)
    await context.close()
  })

  test('backs to the home page and links the GitHub repo without leaving the page', async ({ page }) => {
    await page.goto(path)
    const back = page.locator('#main').getByRole('link', { name: '‹ Início' })
    await expect(back).toHaveAttribute('href', base)
    const repo = page.getByRole('link', { name: 'github.com/hvasoares/voto-a-voto-oss' })
    await expect(repo).toHaveAttribute('href', 'https://github.com/hvasoares/voto-a-voto-oss')
       const manifestLink = page.getByRole('link', { name: 'manifesto do repositório' })
    await expect(manifestLink).toHaveAttribute('href', 'https://github.com/hvasoares/voto-a-voto-oss/blob/main/data/manifest.json')
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
    await expect(entries).toHaveCount(6)
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

  test('keeps the privacy section an honest description of the notice-only measurement', async ({ page }) => {
    await page.goto(path)
    const section = page.locator('section[aria-labelledby="privacidade"]')
    await expect(section).toContainText('não é enviado')
    await expect(section).toContainText('nada pessoal')
    await expect(section).toContainText('Google Analytics')
    await expect(section).toContainText('você está ciente')
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

  test('"Usar os dados" comes right after "Como citar" with the seven ways out and the widget block inside it', async ({ page }) => {
    await page.goto(path)
    const h2s = await page.locator('#main h2').evaluateAll((els) => els.map((e) => e.id))
    expect(h2s.indexOf('usar-os-dados')).toBe(h2s.indexOf('como-citar') + 1)
    const section = page.locator('section#usar-os-dados, section[aria-labelledby="usar-os-dados"]')
    await expect(section).toHaveCount(1)
    await expect(section.locator('[data-use]')).toHaveCount(USES.length)
    expect(await section.locator('[data-use]').evaluateAll((els) => els.map((e) => e.getAttribute('data-use')))).toEqual(USES.map((u) => u.key))
    // the merged widget block keeps its explanation and its entry point; the old address still lands on it
    const widget = section.locator('[data-component="for-newsrooms"]')
    await expect(widget.getByRole('heading', { name: 'Para jornalistas e associações' })).toBeVisible()
    await expect(widget).toContainText('uma única linha de código')
    await expect(widget.getByRole('link', { name: 'Montar o widget de uma cidade ›' })).toHaveAttribute('href', `${base}widget/`)
    await page.goto(`${path}#jornalistas`)
    await expect(page.locator('#jornalistas')).toBeAttached()
    await expect(page.locator('[data-component="for-newsrooms"] h3')).toBeInViewport()
    await page.goto(`${path}#usar-os-dados`)
    await expect(page.locator('#usar-os-dados')).toBeInViewport()
  })

  for (const u of USES) {
    test(`"Usar os dados": the ${u.key} link reaches its page`, async ({ page, request }) => {
      await page.goto(path)
      const edition = (await page.locator('[data-current-edition]').getAttribute('href'))!.match(/edicoes\/([^/]+)\//)![1]!
      const link = page.locator(`[data-component="use-data"] [data-use="${u.key}"]`)
      await expect(link).toHaveAttribute('href', base + u.to.replace('{id}', edition))
      if (u.key === 'feed') {
        expect((await request.get(base + u.to)).ok()).toBe(true)
        return
      }
      await link.click()
      await expect(page).toHaveURL(`${base}${u.to.replace('{id}', edition)}`)
      await expect(page.locator('#main h1').first()).toContainText(u.h1)
    })
  }

  test('"Usar os dados" works without scripts: plain links, one line each', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(path)
    const links = page.locator('[data-component="use-data"] [data-use]')
    await expect(links).toHaveCount(USES.length)
    for (const l of await links.all()) await expect(l).toHaveAttribute('href', /.+/)
    await expect(page.locator('[data-component="use-links"] li')).toHaveCount(6)
    await context.close()
  })

  test('"Usar os dados": keyboard reaches each link in order and shows a focus ring', async ({ page }) => {
    await page.goto(path)
    const links = page.locator('[data-component="use-data"] [data-use]')
    await links.first().focus()
    for (let i = 1; i < USES.length; i++) {
      await page.keyboard.press('Tab')
      await expect(links.nth(i)).toBeFocused()
    }
    expect(await links.last().evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
  })

  test('"Usar os dados": no axe violations (target size included)', async ({ page }) => {
    await page.goto(path)
    const { violations: found } = await new AxeBuilder({ page }).include('[data-component="use-data"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(found.map((v) => v.id)).toEqual([])
  })
})
