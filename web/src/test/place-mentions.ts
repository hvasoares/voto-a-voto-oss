/**
 * Where a state or a region is named in a built page (#184), for the guard `shared/place-links-guard.test.ts`. `placeMentions` reads a page's HTML and returns each
 * place name (a state's abbreviation or full name, a region's name: `PLACE_WORDS` of `lib/place-link.ts`, the words the helper links) found in text that is NOT inside a
 * link. The allow-list is only what the ticket names, plus what cannot be a link:
 *  - the page's own title and heading (`<title>` and `<h1>`) and the document `<head>`;
 *  - form controls (`<input>`, `<textarea>`, `<select>`/`<option>`): their placeholders and values;
 *  - the text inside a shared picture (`<svg>`, `<img>`, `<canvas>`);
 *  - a tile marked `aria-disabled` (a state the dataset has no page for: there is nowhere to link to).
 * A stretch from `except` (a city called "Boa Esperança do Norte", a party acronym that is also a UF code) names no place and is taken out first. Scripts and styles carry no
 * page text; attributes (`aria-label`, `title`, `alt`) are not text and are not read.
 */
import { JSDOM } from 'jsdom'
import { splitPlaces } from '@/lib/place-link'

export interface Mention {
  /** The place name that was found. */
  name: string
  /** A few words around it, for the failure message. */
  context: string
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'HEAD', 'TITLE', 'H1', 'SVG', 'IMG', 'CANVAS', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'SUMMARY', 'A'])

export function placeMentions(html: string, except: readonly string[] = []): Mention[] {
  const doc = new JSDOM(html).window.document
  const found: Mention[] = []
  const walk = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        const text = child.textContent ?? ''
        let at = 0
        for (const s of splitPlaces(text, except)) {
          if (s.place) found.push({ name: s.text, context: text.slice(Math.max(0, at - 25), at + s.text.length + 25).replace(/\s+/g, ' ').trim() })
          at += s.text.length
        }
      } else if (child.nodeType === 1) {
        const el = child as Element
        if (!SKIP.has(el.tagName.toUpperCase()) && el.getAttribute('aria-disabled') !== 'true' && el.getAttribute('aria-current') !== 'page') walk(el)
      }
    }
  }
  walk(doc.body)
  return found
}
