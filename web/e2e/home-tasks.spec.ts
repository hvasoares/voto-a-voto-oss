import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { activateSearch, base, expectNoHorizontalScroll, maybeThrottleCpu, resizeTo, waitReady } from './helpers'

/*
 * #99: Home's task block replaces "Para explorar". Four entries in the visitor's words, the old destinations still one tap away, the
 * finality line, and "Compartilhar um resultado": the search accepts a destination (query parameter `para`, closed list) so that
 * picking a city lands on that city's share sheet. Fixture: Boa Esperança do Norte (mt) is the only city that matches "boa esperanca".
 */
const SHARE_ENTRY = `${base}?para=compartilhar#busca`
const SHEET = new RegExp(`${base}mt/boa-esperanca-do-norte/compartilhar/$`)
const CARD = new RegExp(`${base}mt/boa-esperanca-do-norte/$`)

/** The metrics notice is fixed at the bottom of the phone: acknowledge it so it never covers a row. */
async function ready(page: Page, path = base) {
  await page.goto(path)
  await waitReady(page)
  await page.locator('[data-consent-continue]').click()
}

/** Types a city into the page's search, once the island has loaded its list. */
async function pickBoaEsperanca(page: Page) {
  const box = await activateSearch(page)
  await expect(page.locator('[data-city-search="main"]')).toHaveAttribute('data-ready', 'yes')
  await box.fill('boa esperanca')
  const hit = page.locator('a[data-position]')
  await expect(hit).toHaveCount(1)
  return hit
}

// #122 flake-hunt repeats: E2E_CPU_RATE slows the CPU of every page in this file.
test.beforeEach(async ({ page }) => maybeThrottleCpu(page))

test.describe('the task block', () => {
  test('replaces "Para explorar": the task entries, in order, with their words', async ({ page }) => {
    await page.goto(base)
    await expect(page.getByText('Para explorar')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('O que você quer fazer?')
    const titles = await page.locator('[data-tasks] > ul > li[data-task]').evaluateAll((els) =>
      els.map((e) => [e.getAttribute('data-task'), (e.querySelector('strong') as HTMLElement).textContent]))
    expect(titles).toEqual([
      ['ver-cidade', 'Ver minha cidade'],
      ['compartilhar', 'Compartilhar um resultado'],
      ['comparar', 'Comparar'],
      ['conferir', 'Conferir um número'],
      ['entender', 'Entender o país e os estados'],
      ['usar-os-dados', 'Usar os dados'],
    ])
    const text = (await page.locator('[data-tasks]').innerText()).toLowerCase()
    for (const word of ['vencedor', 'ranking', 'quem ganhou', 'por que']) expect(text).not.toContain(word)
  })

  test('"Ver minha cidade" goes to the search, "Conferir um número" to its section of Sobre os dados', async ({ page }) => {
    await ready(page)
    await page.getByRole('link', { name: /Ver minha cidade/ }).click()
    await expect(page).toHaveURL(`${base}#busca`)
    await expect(page.locator('#busca')).toBeInViewport()
    await page.getByRole('link', { name: /Conferir um número/ }).click()
    await expect(page).toHaveURL(`${base}sobre-os-dados/#confira-voce-mesmo`)
    await expect(page.locator('#confira-voce-mesmo')).toBeVisible()
  })

  for (const [label, path] of [
    ['Brasil e regiões', 'brasil/'],
    ['Mapa por estado', 'mapa/'],
    ['Relatórios', 'relatorios/'],
    ['Três ciclos por estado', 'tres-ciclos/mt/'],
    ['Meus lugares ao longo do tempo', 'meu-brasil/'],
  ] as const) {
    test(`${label}: still one tap from Home`, async ({ page }) => {
      await ready(page)
      await page.locator('[data-tasks]').getByRole('link', { name: new RegExp(label) }).click()
      await expect(page).toHaveURL(`${base}${path}`)
    })
  }

  test('"Usar os dados" leads to its section of Sobre os dados with a plain link', async ({ page }) => {
    await ready(page)
    const entry = page.locator('[data-task="usar-os-dados"] a')
    await expect(entry).toHaveCount(1)
    await expect(entry).toHaveAttribute('href', `${base}sobre-os-dados/#usar-os-dados`)
    await entry.click()
    await expect(page).toHaveURL(`${base}sobre-os-dados/#usar-os-dados`)
    await expect(page.locator('#usar-os-dados')).toBeInViewport()
  })

  test('"Final, não ao vivo." shows once and is visible without scrolling on the phone', async ({ page }) => {
    await page.goto(base)
    expect(page.viewportSize()).toEqual({ width: 390, height: 844 })
    await expect(page.getByText('Final, não ao vivo.')).toHaveCount(1)
    await expect(page.getByText('Final, não ao vivo.')).toBeInViewport({ ratio: 1 })
  })

  test('keyboard: the entries follow one another in reading order and show a focus ring', async ({ page }) => {
    await ready(page)
    const links = page.locator('[data-tasks] a')
    await expect(links).toHaveCount(13)
    await links.first().focus()
    for (let i = 1; i < 13; i++) {
      await page.keyboard.press('Tab')
      await expect(links.nth(i)).toBeFocused()
    }
    const ring = await links.nth(12).evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(ring).not.toBe('none')
  })

  test('every link and button on the block is at least 44 px high', async ({ page }) => {
    await page.goto(base)
    const heights = await page.locator('[data-tasks] a').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44)
  })

  for (const width of [390, 768, 1440]) {
    test(`does not scroll sideways at ${width}`, async ({ page }) => {
      await resizeTo(page, width)
      await page.goto(base)
      await expectNoHorizontalScroll(page)
    })
  }

  test('axe finds no violations', async ({ page }) => {
    await page.goto(base)
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).disableRules(['target-size']).analyze()
    expect(violations.map((v) => v.id)).toEqual([])
  })
})

test.describe('Compartilhar um resultado: the search takes a destination', () => {
  test('entry -> pick a city -> that city\'s share sheet', async ({ page }) => {
    await ready(page)
    await page.getByRole('link', { name: /Compartilhar um resultado/ }).click()
    await expect(page).toHaveURL(SHARE_ENTRY)
    await waitReady(page)
    const hit = await pickBoaEsperanca(page)
    await expect(page.locator('[data-city-search="main"]')).toHaveAttribute('data-destination', 'compartilhar')
    await expect(page.locator('[data-destination-note]')).toBeVisible()
    await hit.click()
    await expect(page).toHaveURL(SHEET)
  })

  test('Enter opens the share sheet too, and a reload keeps the behaviour', async ({ page }) => {
    await page.goto(SHARE_ENTRY)
    await page.reload()
    await waitReady(page)
    await pickBoaEsperanca(page)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(SHEET)
  })

  for (const value of ['', 'cartao', 'https://example.org/', '//example.org/', '../../x', 'constructor', '__proto__', 'COMPARTILHAR']) {
    test(`an unknown destination (${JSON.stringify(value)}) is ignored: the pick opens the card`, async ({ page }) => {
      await page.goto(`${base}?para=${encodeURIComponent(value)}`)
      const hit = await pickBoaEsperanca(page)
      await expect(page.locator('[data-destination-note]')).toHaveCount(0)
      await expect(hit).toHaveAttribute('href', `${base}mt/boa-esperanca-do-norte/`)
      await hit.click()
      await expect(page).toHaveURL(CARD)
    })
  }

  test('without the parameter nothing changes: the pick opens the card', async ({ page }) => {
    await page.goto(base)
    const hit = await pickBoaEsperanca(page)
    await hit.click()
    await expect(page).toHaveURL(CARD)
  })

  test('typing before the island has loaded does not lose the destination', async ({ page }) => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    await page.route(/CitySearch.*\.js/, async (route) => {
      await gate
      await route.continue()
    })
    await page.goto(SHARE_ENTRY)
    await waitReady(page)
    await page.getByRole('combobox', { name: 'Busque sua cidade' }).pressSequentially('boa esperanca', { delay: 0 })
    await expect(page.locator('astro-island[ssr]')).toHaveCount(1)
    release()
    await expect(page.locator('[data-city-search="main"]')).toHaveAttribute('data-ready', 'yes')
    const hit = page.locator('a[data-position]')
    await expect(hit).toHaveCount(1)
    await expect(hit).toHaveAttribute('href', `${base}mt/boa-esperanca-do-norte/compartilhar/`)
    await hit.click()
    await expect(page).toHaveURL(SHEET)
  })

  test('only the latest result is clickable: a quick second query replaces the first', async ({ page }) => {
    await page.goto(SHARE_ENTRY)
    const box = await activateSearch(page)
    await expect(page.locator('[data-city-search="main"]')).toHaveAttribute('data-ready', 'yes')
    await box.fill('cidade')
    await box.fill('boa esperanca')
    await expect(page.locator('a[data-position]')).toHaveCount(1)
    for (const href of await page.locator('a[data-position]').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) expect(href).toMatch(/\/compartilhar\/$/)
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('every entry is a plain link and the share entry carries its instruction', async ({ page }) => {
    await page.goto(base)
    const tasks = page.locator('[data-tasks]')
    await expect(tasks.getByRole('link', { name: /Compartilhar um resultado/ })).toContainText('Escolha a cidade e toque em Compartilhar')
    await expect(tasks.getByRole('link', { name: /Conferir um número/ })).toHaveAttribute('href', `${base}sobre-os-dados/#confira-voce-mesmo`)
    await expect(tasks.getByRole('link', { name: /Brasil e regiões/ })).toHaveAttribute('href', `${base}brasil/`)
    await expect(tasks.getByRole('link', { name: /Meus lugares ao longo do tempo/ })).toHaveAttribute('href', `${base}meu-brasil/`)
    await expect(page.getByText('Final, não ao vivo.')).toBeVisible()
    await tasks.getByRole('link', { name: /Mapa por estado/ }).click()
    await expect(page).toHaveURL(`${base}mapa/`)
  })
})
