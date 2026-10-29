/**
 * The row of a coloured list (#83, extracted by #183): a colour chip, the place's name, the signed margin in points and the valid votes, the whole row ONE
 * plain link to the place. Drawn by the municipality list of the state page (`CityMapMap`'s Lista, hydrated or not) and by the states of a region page
 * (rendered to static HTML, no island). Colour never carries the meaning alone: the signed pp is on the row, and the words that say who is ahead are read, not seen.
 *
 *  - `href`        where the row goes;
 *  - `chip`        the colour of the chip (the scale's bin colour, or a muted token for a place with no pairing);
 *  - `name`        the row's own text (label in name);
 *  - `figure`      the margin as text ("+15,2 pp", or "sem dados");  `figureSr` what is only read ("a pessoa à frente");
 *  - `votes`       the valid votes, formatted.
 * Every other attribute (`data-cd`, `data-uf`, ...) goes to the link.
 */
import type { AnchorHTMLAttributes, ReactElement } from 'react'

interface ListRowProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  href: string
  chip: string
  name: string
  figure: string
  figureSr: string
  votes: string
}

export default function ListRow({ href, chip, name, figure, figureSr, votes, ...attrs }: ListRowProps): ReactElement {
  return (
    <a
      className="flex min-h-11 items-center gap-2 border-t border-border px-1 text-left text-foreground [content-visibility:auto] [contain-intrinsic-size:auto_45px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      href={href}
      {...attrs}
    >
      <span aria-hidden="true" className="w-4 shrink-0 self-center rounded-sm border border-border" style={{ background: chip, height: 18 }} />
      <span className="min-w-0 flex-1 text-step-2 wrap-anywhere">{name}</span>
      <span className="text-step-1">
        {figure}
        <span className="sr-only">{figureSr}</span>
      </span>
      <span className="text-step-1 text-muted-foreground">
        {votes}
        <span className="sr-only"> votos válidos</span>
      </span>
    </a>
  )
}
