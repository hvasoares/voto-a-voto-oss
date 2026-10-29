/**
 * Guard (#138): the ten picture writers draw only what is theirs (their content); the frame, the "EXEMPLO" tag, the size pick of a headline or an
 * address line, the heights of a flowing card and the source line belong to the shared builder `share-picture.ts`. A writer that writes one
 * of them again is a copy, and the next change has to be made ten times. `findPictureCopies` is pure; the seeded sources prove each rule can fail.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const PICTURE_WRITERS = ['share', 'stat', 'recap', 'brasil', 'duel', 'meu-brasil', 'sticker', 'story', 'stay-home', 'guess'].map((n) => `${n}-card.ts`)

const RULES: { what: string; re: RegExp }[] = [
  { what: 'its own SVG root (use pictureSvg / cardSvg / flowCard)', re: /<svg\b/ },
  { what: 'its own thick ink border (use paperFrame via cardSvg)', re: /stroke-width="10"/ },
  { what: 'its own "EXEMPLO" tag (use exampleTag / fixtureBand)', re: /\b285\b/ },
  { what: 'its own size pick with a fallback (use largestFit / fitLines)', re: /\.find\(\(sz\) =>[^\n]*\?\?/ },
  { what: 'its own height from the flow (use flowCard)', re: /Math\.round\(y\)/ },
  { what: 'its own text style (use text() from the builder)', re: /font-family=/ },
]

/** The rules a writer's source (comments removed) breaks. */
export function findPictureCopies(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\/|(?<![:\w"'`/])\/\/[^\n]*/g, '')
  return RULES.filter(({ re }) => re.test(code)).map(({ what }) => what)
}

describe('the picture writers hold no copy of the shared builder (#138)', () => {
  it.each(PICTURE_WRITERS)('%s', (file) => {
    expect(findPictureCopies(readFileSync(resolve(__dirname, file), 'utf-8'))).toEqual([])
  })

  it('every rule catches the copy it is written for (the guard is not vacuous)', () => {
    const copies = [
      '`<svg xmlns="http://www.w3.org/2000/svg">`',
      '`<rect stroke-width="10"/>`',
      "rect(LEFT, 69, 285, 78, colors.flag, ' rx=\"10\"')",
      'const size = [52, 48].find((sz) => wrap(h, sz, INNER, 5)) ?? 36',
      'const H = Math.round(y)',
      '`<text font-family="${SANS}">`',
    ]
    expect(copies.map((c) => findPictureCopies(c).length)).toEqual(copies.map(() => 1))
  })

  it('a mention in a comment is not a copy', () => {
    expect(findPictureCopies('/* <svg> 285 */ // stroke-width="10"\nconst a = 1')).toEqual([])
  })
})
