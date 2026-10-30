/**
 * The city's share sheet DRAWN from its data file (private#210, the lighter-site milestone): the draw function of the `compartilhar` family for
 * `loadPageData` (`lib/page-data-loader.ts`; the page script is `scripts/share-page.ts`).
 *
 * Nothing new is drawn here. The frame is the strings of `lib/share-frame.ts` (the demo and Brasil routes print the same ones); the picture, the message
 * and the Share / Download buttons are the `ShareSheet` island (it builds the picture with `shareContent`, makes the PNG as soon as it mounts with
 * `svgToPng` and shares with `performShare`: the PNG exists before the visitor taps, so `navigator.share` stays inside the tap, the iOS rule of
 * `lib/share-flow.ts`); the ready-made texts are `CityTextsBlock`. Both islands are rendered at once (`flushSync`), so the stub says `data-ready` with the
 * sheet already in the page.
 */
import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import ShareSheet from '@/components/ShareSheet'
import CityTextsBlock from '@/components/CityTextsBlock'
import { cityTextsOf } from './city-texts-build'
import { attrString, shareFooterSource, shareFrameHead, shareFrameLinks, shareSheetAttrs, SHARE_CLOSE_CLASS, SHARE_FOOTER_CLASS, STUB_SHEET } from './share-frame'
import { shareSheetContent, type ShareSheetRecord } from './share-sheet-record'
import { sourceFooter } from '@/shared/footer'
import { displayName } from '@/shared/city-search'
import { linkHref } from '@/paths'

export function drawShareSheet(data: ShareSheetRecord, host: HTMLElement): void {
  const { uf, slug, nome, view, origin, base, fixture, edition, editionDate, question } = data
  const content = shareSheetContent(data)
  const href = (path: string) => linkHref(path, base)
  const sheet = attrString({ ...shareSheetAttrs({ uf, slug, view: `${view.ano}-${view.turno}`, filename: content?.filename }), class: STUB_SHEET })
  const footer = sourceFooter({ source: shareFooterSource(fixture), aboutHref: href('sobre-os-dados/'), separator: ' · ', aboutClass: '', class: SHARE_FOOTER_CLASS })
  host.innerHTML = `<section ${sheet}>
  ${shareFrameHead({ closeHref: href(`/${uf}/${slug}/`), closeClass: SHARE_CLOSE_CLASS, closeCross: true })}
  <div data-share-body></div>
  ${shareFrameLinks({ qrHref: href(`/${uf}/${slug}/qr/`), generatorHref: href(`/gerador/?cidade=${uf}/${slug}`) })}
  <div data-share-texts></div>
  ${footer}
</section>`
  const texts = cityTextsOf(data, { origin, base, fixture, editionDate })
  flushSync(() => {
    createRoot(host.querySelector('[data-share-body]')!).render(createElement(ShareSheet, { uf, slug, view, initial: content, origin, base, fixture, edition, question, cityName: nome }))
    createRoot(host.querySelector('[data-share-texts]')!).render(createElement(CityTextsBlock, { texts, stateHref: href(`/textos/${uf}.txt`), except: [nome, displayName(nome)] }))
  })
  // The sheet carries its own title and "Fechar": the stub's heading and link back are hidden (the `hidden` attribute, so the title is heard once).
  const main = host.closest('main')
  main?.querySelector('h1')?.setAttribute('hidden', '')
  main?.querySelector('[data-stub-back]')?.setAttribute('hidden', '')
}
