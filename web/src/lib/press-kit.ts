/**
 * The state press kit (#66), PURE: the source seal that every image carries, and the captions file of a state. The kit is deterministic: the same dataset and
 * the same edition give the same bytes (no date of the build, no random id). The words come from the catalog (`press.*`).
 */
import { DEFAULT_VOICE, message as say, type MessageKey, type Voice } from './sentences/catalog'
import './sentences/catalog-press'
import { citation, editionLabel } from './editions'
import { esc } from './share-card'

const sayer = (voice: Voice = DEFAULT_VOICE) => (key: string, params: Record<string, string | number> = {}) => say(voice, key as MessageKey, params)

export const SEAL_BAND = 64

export interface SealOptions {
  edition: string
  fixture: boolean
  voice?: Voice
}

/** The seal's one line (what is printed in each band). */
export function sealLine(o: SealOptions): string {
  const t = sayer(o.voice)
  return o.fixture ? t('press.seal.fixture') : t('press.seal', { edition: o.edition })
}

/**
 * The picture with the source seal at the top, in the middle (a watermark line across the picture) and at the foot: the picture grows by a band above and a band
 * below, so the seal is never over the data, and a crop that drops either band still leaves the other and the middle line. Needs the picture's `<svg ... viewBox>`.
 */
export function sealSvg(svg: string, o: SealOptions): string {
  const open = /<svg\b[^>]*>/.exec(svg)
  const box = open && /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(open[0])
  if (!open || !box) throw new Error('sealSvg: no-viewBox')
  const w = Number(box[1])
  const h = Number(box[2])
  const total = h + 2 * SEAL_BAND
  const line = esc(sealLine(o))
  const size = 24
  const band = (y: number) => `<rect data-seal-band x="0" y="${y}" width="${w}" height="${SEAL_BAND}" fill="#14505c"/><text data-seal x="${w / 2}" y="${y + SEAL_BAND / 2 + size / 3}" font-family="Helvetica Neue, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#faf7f0" text-anchor="middle">${line}</text>`
  const middle = `<text data-seal data-seal-middle x="${w / 2}" y="${SEAL_BAND + h / 2}" font-family="Helvetica Neue, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#14505c" fill-opacity="0.35" text-anchor="middle">${line}</text>`
  const head = open[0].replace(/viewBox="[^"]*"/, `viewBox="0 0 ${w} ${total}"`).replace(/height="[^"]*"/, `height="${total}"`)
  const inner = svg.slice(open.index + open[0].length, svg.lastIndexOf('</svg>'))
  return `${svg.slice(0, open.index)}${head}${band(0)}<g transform="translate(0 ${SEAL_BAND})">${inner}</g>${middle}${band(SEAL_BAND + h)}</svg>`
}

export interface KitCaptionsInput {
  stateName: string
  uf: string
  /** The sentence of the recap picture, per register: caption and text alternative are the same words. */
  caption: string
  captionPlain: string
  file: string
  edition: { id: string; date: string }
  /** The permanent address of the edition, with scheme. */
  editionUrl: string
  pageUrl: string
  hasData: boolean
}

export function kitCaptions(i: KitCaptionsInput): string {
  const t = sayer()
  const lines = [
    t('press.kit.title', { state: i.stateName }),
    '',
    t('press.kit.chart', { file: i.file }),
    '',
    `${t('press.kit.caption')}:`,
    i.hasData ? i.caption : t('press.kit.nodata', { state: i.stateName }),
    '',
    `${t('press.kit.alt')}:`,
    i.hasData ? i.caption : t('press.kit.nodata', { state: i.stateName }),
    '',
    `${t('press.kit.plain')}:`,
    i.hasData ? i.captionPlain : t('press.kit.nodata', { state: i.stateName }),
    '',
    `${t('press.kit.credit')}: ${t('press.credit', { date: editionLabel(i.edition) })}`,
    `${t('press.kit.licence')}: ${t('press.licence')}`,
    `${t('press.kit.cite')}: ${citation(i.edition, i.editionUrl)}`,
    i.pageUrl,
    '',
    t('press.kit.limits'),
  ]
  return `${lines.join('\n')}\n`
}
