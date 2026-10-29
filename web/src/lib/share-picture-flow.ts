/**
 * The blocks of a card as tall as its content (#138), PURE: recap, Brasil, Meu Brasil, duel, "Ficaram em casa" and the sticker stack them down the
 * 1080-wide column (`LEFT` 98, `INNER` 884) with a running `y`. Each block draws at `y` into `out` and returns where the next one starts. They live
 * apart from the primitives of `share-picture.ts` so the islands that draw only the share card do not carry them.
 */
import { colors } from '@/shared/tokens'
import { cardSvg, exampleTag, fit, fitLines, INNER, LEFT, largestFit, text, wrap } from './share-picture'

/** A card as tall as its content: the height is `y` (where the content ended) rounded. */
export function flowCard(width: number, y: number, title: string, parts: readonly string[]): { svg: string; height: number } {
  const height = Math.round(y)
  return { svg: cardSvg({ width, height, title, parts }), height }
}

/** The tag at the top of a flowing card when the data is fictitious; returns where the content starts (`gap` px under the tag). */
export function fixtureBand(out: string[], fixture: boolean | undefined, label: string, y: number, gap = 36): number {
  if (!fixture) return y
  out.push(exampleTag(LEFT, y, label))
  return y + 78 + gap
}

/** The headline in the serif at the first size of `sizes` that holds it in `lines` lines; `y` is the top, the result is where the next block starts. */
export function headlineBlock(out: string[], headline: string, y: number, o: { sizes: readonly number[]; lines: number; left?: number; inner?: number }): number {
  const { size, lines } = fitLines(headline, o.sizes, o.inner ?? INNER, o.lines)
  y += size
  for (const line of lines) (out.push(text(o.left ?? LEFT, y, size, line, { serif: true })), (y += size * 1.3))
  return y
}

/** A paragraph in the muted grey, `step` px between baselines, drawn `dy` below `y`; wrapped in at most `lines` lines, cut with "…" if it cannot be. Returns the next `y`. */
export function mutedLines(out: string[], content: string, y: number, o: { size: number; lines: number; step: number; dy?: number }): number {
  for (const line of wrap(content, o.size, INNER, o.lines) ?? [fit(content, o.size, INNER)]) (out.push(text(LEFT, y + (o.dy ?? 0), o.size, line, { fill: colors.muted })), (y += o.step))
  return y
}

/** The short address (bold, the first of `addressSizes` that fits) and the source line under it; returns the `y` after the block. */
export function footerBlock(out: string[], y: number, o: { address: string; brand: string; addressSizes?: readonly number[]; addressStep?: number }): number {
  const size = largestFit(o.address, o.addressSizes ?? [44, 40, 36], INNER, true)
  out.push(text(LEFT, y, size, fit(o.address, size, INNER, true), { weight: 600 }))
  y += o.addressStep ?? 52
  out.push(text(LEFT, y, largestFit(o.brand, [36, 32, 28], INNER), o.brand, { fill: colors.muted }))
  return y + 70
}
