/**
 * One mention of a state or a region (#184): a link to its page, with the accessible name that says where it goes ("Página do estado RJ · Rio de Janeiro"). No hooks, so
 * it draws the same in an Astro page (static HTML), in a React island and inside `PlaceText`. The helper behind it is `lib/place-link.ts` (`placeLinkHtml` is the same anchor
 * for the builders of HTML strings); no page writes this link itself.
 *
 *  - `place`   the state (`{ kind: 'uf', uf }`) or the region (`{ kind: 'regiao', regiao }`);
 *  - `text`    what is printed (default: the abbreviation of a state in upper case, the name of a region); a state's full name is a `text` too;
 *  - `plain`   draw the text only: the mention sits inside a link that already goes there (a row, a card), and a link never holds a second link;
 *  - `className` extra classes of the link (a heading's size, a table cell's weight);
 *  - `extra`   extra attributes of the link (a script that retargets the link reads them: `data-*`).
 */
import type { ReactElement } from 'react'
import { siteHref } from '@/paths'
import { PLACE_LINK_CLASS, placeLabel, placePath, placeText, type PlaceRef } from '@/lib/place-link'

interface PlaceLinkProps {
  place: PlaceRef
  text?: string
  plain?: boolean
  className?: string
  extra?: Record<string, string>
}

export default function PlaceLink({ place, text, plain = false, className, extra }: PlaceLinkProps): ReactElement {
  const shown = text ?? placeText(place)
  if (plain) return <span data-place={place.kind}>{shown}</span>
  return (
    <a className={className ? `${PLACE_LINK_CLASS} ${className}` : PLACE_LINK_CLASS} data-place={place.kind} href={siteHref(placePath(place))} aria-label={placeLabel(place)} {...extra}>
      {shown}
    </a>
  )
}
