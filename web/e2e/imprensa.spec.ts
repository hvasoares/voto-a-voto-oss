import { expect, test, type Page } from '@playwright/test'
import { base } from './helpers'

/*
 * "Para a imprensa" (#66) over the fixture dataset: the page with the licence and the credit, the state kit files (sealed chart, captions), and the A2 poster and
 * the A3 sheet printing on ONE page of the paper size, without cropping. The checks print to PDF with the page's own `@page` size.
 */
const press = `${base}imprensa/`
const sheet = `${base}imprensa/folha/?mora=rj/cidade-exemplo`

async function pdfOf(page: Page) {
  await page.emulateMedia({ media: 'print' })
  const bytes = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1')
  const pages = (bytes.match(/\/Type\s*\/Page[^s]/g) ?? []).length
  const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(bytes)
  return { pages, width: Number(box![1]), height: Number(box![2]) }
}

test.describe('Para a imprensa', () => {
  test('says the licence and the credit, lists a kit per state and only Sobre os dados links to it', async ({ page }) => {
    await page.goto(press)
    await expect(page.locator('h1')).toHaveText('Para a imprensa')
    await expect(page.locator('[data-licence]')).toContainText('CC BY 4.0')
    await expect(page.locator('[data-credit]')).toContainText('Crédito: Voto a Voto, a partir de dados do TSE')
    for (const uf of ['rj', 'sp', 'mt']) {
      const kit = page.locator(`[data-kit="${uf}"]`)
      await expect(kit.locator('a[href$="resumo-do-estado.svg"]')).toHaveAttribute('href', `${base}imprensa/kit/${uf}/resumo-do-estado.svg`)
      await expect(kit.locator('a[href$="legendas.txt"]')).toHaveAttribute('href', `${base}imprensa/kit/${uf}/legendas.txt`)
      await expect(kit.locator(`a[href="${base}imprensa/cartaz/${uf}/"]`)).toBeVisible()
    }
    for (const path of ['', 'rj/', 'rj/cidade-exemplo/', 'relatorios/']) {
      await page.goto(`${base}${path}`)
      expect(await page.locator('a[href*="imprensa"]').count(), path).toBe(0)
    }
    // #102: the one way in is the "Usar os dados" section of Sobre os dados
    await page.goto(`${base}sobre-os-dados/`)
    await expect(page.locator('a[href*="imprensa"]')).toHaveCount(1)
    await expect(page.locator('[data-component="use-data"] a[data-use="imprensa"]')).toHaveAttribute('href', press)
  })

  test('the chart of a state carries the source seal at the top, in the middle and at the foot, and the captions file has the credit', async ({ request }) => {
    const svg = await (await request.get(`${press}kit/rj/resumo-do-estado.svg`)).text()
    expect(svg.match(/<text data-seal/g)).toHaveLength(3)
    const box = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!
    const total = Number(box[2])
    const ys = [...svg.matchAll(/<text data-seal[^>]* y="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(Math.min(...ys)).toBeLessThan(total * 0.2)
    expect(Math.max(...ys)).toBeGreaterThan(total * 0.8)
    expect(svg).toContain('Fonte real: TSE')
    const res = await request.get(`${press}kit/rj/legendas.txt`)
    expect(res.headers()['content-type']).toContain('text/plain')
    const txt = await res.text()
    expect(txt).toContain('Kit de imprensa: Rio de Janeiro')
    expect(txt).toContain('Texto alternativo:')
    expect(txt).toContain('CC BY 4.0')
    expect(txt).not.toMatch(/porque|vence|lidera/i)
  })

  test('the A2 poster of a state prints on one A2 page, without cropping', async ({ page }) => {
    await page.goto(`${press}cartaz/rj/`)
    await expect(page.locator('[data-poster] h1')).toHaveText('Rio de Janeiro')
    await expect(page.locator('[data-poster] svg [data-selected="true"]')).toHaveCount(1)
    await expect(page.locator('[data-poster] [data-seal]')).toHaveCount(3)
    const pdf = await pdfOf(page)
    expect(pdf.pages).toBe(1)
    expect(Math.round(pdf.width)).toBe(1191)
    expect(Math.round(pdf.height)).toBe(1684)
    const fits = await page.evaluate(() => {
      const p = document.querySelector('[data-poster]')!.getBoundingClientRect()
      const last = document.querySelector('.poster__source')!.getBoundingClientRect()
      return { posterW: p.width, posterH: p.height, lastBottom: last.bottom, scrollW: document.documentElement.scrollWidth }
    })
    expect(fits.lastBottom).toBeLessThanOrEqual(fits.posterH + 1)
    expect(fits.scrollW).toBeLessThanOrEqual(Math.ceil(fits.posterW))
  })

  test('the A3 sheet of a city (the place is in the address) prints on one A3 page, with the QR and the source line', async ({ page }) => {
    await page.goto(sheet)
    await expect(page.locator('[data-sheet]')).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('[data-sheet-page] svg [data-seal]')).toHaveCount(3)
    await expect(page.locator('.sheet__qr svg')).toBeVisible()
    await expect(page.locator('.sheet__source')).toContainText('Fonte real: TSE')
    const pdf = await pdfOf(page)
    expect(pdf.pages).toBe(1)
    expect(Math.round(pdf.width)).toBe(842)
    expect(Math.round(pdf.height)).toBe(1191)
    const bottom = await page.evaluate(() => document.querySelector('.sheet__source')!.getBoundingClientRect().bottom - document.querySelector('[data-sheet-page]')!.getBoundingClientRect().bottom)
    expect(bottom).toBeLessThanOrEqual(1)
  })

  test('the sheet without a place asks for one, and makes no request beyond the site', async ({ page }) => {
    const origins = new Set<string>()
    page.on('request', (r) => origins.add(new URL(r.url()).origin))
    await page.goto(`${base}imprensa/folha/`)
    await expect(page.locator('[data-placeholder]')).toContainText('Informe a cidade no endereço')
    expect(origins.size).toBe(1)
  })
})
