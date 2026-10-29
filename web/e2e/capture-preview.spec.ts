import { expect, test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { OG_CARD } from './presets'

/*
 * Ticket #8's capture: the og:image raster the build drew for the fixture city, next to the SAME svg
 * drawn by the browser. The review protocol's frames cover the site's screens; this capture is the
 * rasterisation itself (the only new picture #8 publishes): the og:image of /rj/cidade-exemplo/
 * (built from previewSvg, the share drawing) compared with the very file the share sheet's island
 * received as its pre-rendered picture (the same drawing, drawn at the card size by the page itself —
 * the browser renders the identical svg at the og size). Fresh-context reviewer: web/reference/
 * …: the pair to compare is inside .captures/city-preview/ (both sides are 480x476).
 */
const route = `${base}rj/cidade-exemplo/`

test('capture city-preview / og-image raster vs the same svg rendered by the browser', async ({ page }) => {
  // the built (served) og:image for the city
  await page.goto(route)
  const promised = (await page.locator('meta[property="og:image"]').getAttribute('content'))!
  // the tag is absolute at the built origin; the served file is the same path on this server
  const response = await page.request.get(new URL(promised).pathname)
  expect(response.ok()).toBe(true)
  const raster = await response.body()
  expect(response.headers()['content-type']).toBe('image/png')

  // the drawing the island received pre-rendered (shareContent's svg of the default view — the same
  // drawing previewSvg rasterises; only the display size differs, the viewBox is identical)
  await page.goto(`${base}rj/cidade-exemplo/compartilhar/`)
  const props = JSON.parse((await page.locator('astro-island[props]').getAttribute('props'))!)
  // Astro serialises every prop value as [type, actual]; the island's `initial` holds the ShareContent
  const initial = props.initial[1] as Record<string, [number, unknown]>
  const picture = (Object.entries(initial).find(([, [type, v]]) => type === 0 && typeof v === 'string' && (v as string).startsWith('<svg'))?.[1][1] ?? '') as string
  expect(picture, 'the pre-printed picture is the share svg').toContain('<svg')
  expect(picture).toContain('viewBox="0 0 1080 1070"')

  // the very svg the raster came from (same viewBox; the raster tags it at 480x476) rendered by the
  // browser at exactly the og:image size, in its own 480x476 context (an <img>, so the viewBox of the
  // card-size svg is scaled to the og dimensions exactly like any og:image display)
  const encoded = Buffer.from(picture, 'utf8').toString('base64')
  const browser2 = await page.context().browser()!.newContext({ viewport: OG_CARD, deviceScaleFactor: 1, isMobile: false })
  const page2 = await browser2.newPage()
  await page2.setContent(
    `<!doctype html><html><head><meta name="viewport" content="width=480"></head><body style="margin:0"><img width="480" height="476" src="data:image/svg+xml;base64,${encoded}"></body></html>`,
  )
  await capture(page2, {
    dir: 'city-preview',
    name: 'svg-rendered',
    route: `${base}rj/cidade-exemplo/compartilhar/`,
    viewport: page.viewportSize() ?? undefined,
    fullPage: false,
    extra: { slot: 'city-preview', state: 'svg-rendered', reference: 'the built og:image raster (og-image.png, 480x476)', note: 'the island’s pre-printed share svg rendered by Chromium at the og:image size' },
  })
  await browser2.close()

  // the picture of ticket #8: the raster itself (already drawn; no fonts to wait on)
  await capture(page, {
    dir: 'city-preview',
    name: 'og-image',
    route,
    fullPage: false,
    png: raster,
    fonts: false,
    extra: {
      slot: 'city-preview',
      state: 'og-image',
      ogImage: promised,
      bytes: raster.length,
      type: response.headers()['content-type'],
      reference: 'the same drawing rendered by the browser in this capture (svg-rendered.png)',
      note: 'the picture of ticket #8: shareCardSvg (via previewSvg) rasterised by sharp at 480x476; compare with svg-rendered.png — the identical svg rendered by Chromium (fonts of the browser vs the rasteriser)',
    },
  })
})
