/**
 * A text with its mentions of states and regions as links (#184): the markup for the catalog's sentences (fact records, a card's line, "RJ · selecionado") and for any printed
 * text that names a place, as `calcLink` is for the calculation. The text is the sentence already filled; every state (abbreviation or name) and region in it becomes a
 * `PlaceLink`, the rest stays text. No hooks: it draws in an island and in a page (`PlaceText.astro` adds the build's own exceptions for the pages).
 *
 *  - `except`  stretches that hold a place word without naming the place (a city called "Boa Esperança do Norte"): they stay plain;
 *  - `plain`   draw the text with no link: the sentence sits inside a link that already goes there, and a link never holds a second link.
 */
import type { ReactElement } from 'react'
import { splitPlaces } from '@/lib/place-link'
import PlaceLink from './PlaceLink'

interface PlaceTextProps {
  text: string
  except?: readonly string[]
  plain?: boolean
}

export default function PlaceText({ text, except = [], plain = false }: PlaceTextProps): ReactElement {
  const segments = plain ? [{ text }] : splitPlaces(text, except)
  return <>{segments.map((s, i) => ('place' in s && s.place ? <PlaceLink key={i} place={s.place} text={s.text} /> : s.text))}</>
}
