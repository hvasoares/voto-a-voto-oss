import { expect, type Page } from '@playwright/test'
import { base } from './helpers'

/*
 * The structural type probe (#86, extended by #87): every readable text node of a page sits on the four steps (13, 16, 20, 26 px) and
 * the two weights (400, 700), nothing is under 13 px, nothing is wider than the viewport, nothing is clipped. Drawn text in an inline
 * SVG (the maps' labels) counts by its RENDERED size (user units times the picture's scale), because that is what the eye reads.
 *
 * DOCUMENTED EXCEPTIONS (nothing else is allowed):
 *  - decorative text under `aria-hidden="true"`, `[hidden]` or `.sr-only` (not readable text);
 *  - the 1080-wide print pictures drawn inline (`svg[viewBox^="0 0 1080 "]`: share poster, link preview, recap, story and Brasil pictures) have
 *    their own scale, like the PNG/SVG files they are the source of; they are saved and shared, not read as page text;
 *  - `/overlay/tela/` (a broadcast overlay sized in viewport units) and the duel stage's `clamp()` sizes are not in the list.
 * The print pictures (share poster, preview, recap, Brasil picture) are SVG files, not DOM text, so they are not walked here.
 */
export const SCALE = [13, 16, 20, 26]
export const WEIGHTS = [400, 700]

export interface Screen {
  name: string
  path: string
  /** Extra wait after load, for a page that draws something after hydration. */
  settle?: string
  /** The migration family (#87 commits) the page belongs to. */
  family: string
}

const ALL_SCREENS: Screen[] = [
  { name: 'City card', path: 'rj/cidade-exemplo/?turno=1', family: 'a' },
  { name: 'City card, round 2', path: 'rj/cidade-exemplo/?turno=2', family: 'a' },
  { name: 'Home', path: '', family: 'a' },
  { name: 'State page', path: 'rj/', family: 'e' },
  { name: 'Mapa, list', path: 'mapa/', family: 'b' },
  { name: 'Mapa, map', path: 'mapa/?vista=mapa', settle: 'svg[data-drawn], svg', family: 'b' },
  { name: 'Mapa de um estado', path: 'mapa/rj/', family: 'b' },
  { name: 'Mapa de um estado, map', path: 'mapa/rj/?vista=mapa', settle: 'svg', family: 'b' },
  { name: 'Mapa, virada', path: 'mapa/virada/', family: 'b' },
  { name: 'Brasil', path: 'brasil/', family: 'c' },
  { name: 'Brasil, compartilhar', path: 'brasil/compartilhar/', family: 'c' },
  { name: 'Relatórios', path: 'relatorios/', family: 'd' },
  { name: 'A report', path: 'relatorios/comparecimento/', family: 'd' },
  { name: 'Another report', path: 'relatorios/votos-ganhos-e-perdidos/', family: 'd' },
  { name: 'Comparar 2022', path: 'comparar/2022/', family: 'd' },
  { name: 'Edições', path: 'edicoes/', family: 'd' },
  { name: 'An edition', path: 'edicoes/2026-10-26/', family: 'd' },
  { name: 'Three cycles, state', path: 'tres-ciclos/rj/', family: 'e' },
  { name: 'Three cycles, city', path: 'rj/cidade-exemplo/tres-ciclos/', family: 'e' },
  { name: 'Sobre os dados', path: 'sobre-os-dados/', family: 'g' },
  { name: 'Cara a cara', path: 'cara-a-cara/?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista', family: 'f' },
  { name: 'Meu Brasil', path: 'meu-brasil/', family: 'f' },
  { name: 'Imprensa', path: 'imprensa/', family: 'f' },
  { name: 'Fale sem errar', path: 'fale-sem-errar/', family: 'f' },
  { name: 'Overlay builder', path: 'overlay/', family: 'f' },
  { name: 'Adivinhe', path: 'adivinhe/', family: 'f' },
  { name: 'Widget', path: 'widget/', family: 'f' },
  { name: 'Dados para nerds', path: 'dados-para-nerds/', family: 'f' },
  { name: 'Dados para nerds, state', path: 'dados-para-nerds/estado/rj/', family: 'f' },
  { name: 'A fact page', path: 'fato/brasil/2026-2/', family: 'e' },
  { name: 'Gerador', path: 'gerador/', family: 'f' },
  { name: 'API', path: 'api/', family: 'f' },
  { name: 'Compartilhar', path: 'compartilhar/', family: 'h' },
  { name: 'City share sheet', path: 'rj/cidade-exemplo/compartilhar/', family: 'h' },
  { name: 'State summary', path: 'rj/resumo/', family: 'e' },
  { name: 'State story', path: 'rj/historia/', family: 'e' },
  { name: 'Meu Brasil story', path: 'meu-brasil/historia/', family: 'f' },
  { name: 'Meu Brasil sticker', path: 'meu-brasil/adesivo/', family: 'f' },
  { name: 'Mapa, ficaram em casa', path: 'mapa/ficaram-em-casa/', family: 'b' },
]

export const SCREENS = ALL_SCREENS

export interface Row {
  size: number
  weight: number
  tag: string
  text: string
}

/** Lets the page finish: its own ready flag when it has one, and every island that is going to hydrate. */
export async function settle(page: Page, extra?: string) {
  await page.waitForLoadState('load')
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined, null, { timeout: 2500 }).catch(() => {})
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr][client="load"]'), null, { timeout: 4000 }).catch(() => {})
  if (extra) await page.locator(extra).first().waitFor({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(150)
}

/** Every readable text node: its rendered size and weight. */
export async function textStyles(page: Page): Promise<Row[]> {
  return page.evaluate(() => {
    const rows: { size: number; weight: number; tag: string; text: string }[] = []
    for (const el of document.querySelectorAll('body *')) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent?.trim()).map((n) => n.textContent!.trim()).join(' ')
      if (!own) continue
      if (el.closest('script, style, noscript, [hidden], [aria-hidden="true"], .sr-only, svg[viewBox^="0 0 1080 "]')) continue
      const box = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || box.width <= 1 || box.height <= 1) continue
      let size = parseFloat(cs.fontSize)
      if (el instanceof SVGTextContentElement) size *= (el.getScreenCTM()?.a ?? 1)
      rows.push({ size: Math.round(size * 100) / 100, weight: Number(cs.fontWeight), tag: `${el.tagName.toLowerCase()}.${String(el.getAttribute('class') ?? '').split(' ')[0]}`, text: own.slice(0, 40) })
    }
    return rows
  })
}

/** A drawn size is rendered user units times a scale, so it may be a hair off the step (13.09 for 13). */
const onScale = (size: number) => SCALE.some((s) => Math.abs(size - s) <= 0.15)

export function offScale(rows: Row[]): string[] {
  return rows.filter((r) => !onScale(r.size) || !WEIGHTS.includes(r.weight)).map((r) => `${r.size}px/${r.weight} ${r.tag} "${r.text}"`)
}

/** The whole probe for one page; `viewportWidth` is read from the page. */
export async function probe(page: Page, screen: Screen) {
  await page.goto(`${base}${screen.path}`)
  await settle(page, screen.settle)
  const rows = await textStyles(page)
  expect(rows.length, `${screen.name} has readable text`).toBeGreaterThan(0)
  expect(offScale(rows), `off-scale text on ${screen.name}`).toEqual([])
  expect(Math.min(...rows.map((r) => r.size))).toBeGreaterThanOrEqual(13)
  const iw = await page.evaluate(() => window.innerWidth)
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `${screen.name} scrolls sideways`).toBeLessThanOrEqual(iw)
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().width > 1 && !el.closest('.sr-only, [hidden], .source-footer__about, svg, [aria-hidden="true"]') && el.textContent?.trim() && el.scrollWidth > el.clientWidth + 1 && ['hidden', 'clip'].includes(getComputedStyle(el).overflowX))
      .map((el) => `${el.tagName}.${el.className} "${el.textContent!.trim().slice(0, 30)}"`),
  )
  expect(clipped, `clipped text on ${screen.name}`).toEqual([])
}
