import { useMemo } from 'react'
import { usePlaceCards } from '@/components/use-place-cards'
import { DEFAULT_VOICE, message, type MessageKey } from '@/lib/sentences/catalog'
import '@/lib/sentences/catalog-press'
import { meuBrasilContent } from '@/lib/meu-brasil-content'
import { sealSvg } from '@/lib/press-kit'
import { glyphSvg, qrGlyph } from '@/lib/qr-code'
import { cityUrl } from '@/lib/share-url'
import { shortAddress } from '@/lib/share-text'

/**
 * The A3 city sheet (#66), drawn in the browser from the city's own shard (the place is the address's `mora`): the city across the three cycles (the Meu Brasil card of
 * that one place), the source seal at the top, the middle and the foot, a QR to the city's page and the source line. One page for every city: no file per city.
 * Printing is the browser's own print command (`@page A3`).
 */
export interface PressSheetProps {
  base: string
  origin: string
  fixture: boolean
  edition: string
  example: string
}

const say = (key: string, params: Record<string, string | number> = {}) => message(DEFAULT_VOICE, key as MessageKey, params)

export default function PressSheet({ base, origin, fixture, edition, example }: PressSheetProps) {
  const { refs, cards, failed } = usePlaceCards(base)
  const card = cards[0]
  const sheet = useMemo(() => {
    if (!card) return undefined
    const content = meuBrasilContent([card], { origin, base, fixture, edition })
    const cityPage = cityUrl(origin, base, card.ref.uf, card.ref.slug)
    return {
      svg: sealSvg(content.svg, { edition, fixture }),
      qr: glyphSvg(qrGlyph(cityPage), { label: `QR de ${shortAddress(cityPage)}`, margin: 1, paper: '#ffffff' }),
      address: shortAddress(cityPage),
      name: card.name,
    }
  }, [card, origin, base, fixture, edition])

  return (
    <div data-sheet data-ready={sheet ? 'yes' : 'no'}>
      <div className="print:hidden" data-screen>
        {!sheet && (
          <p className="mt-3 rounded bg-[var(--c-paper-2)] px-3 py-2 text-step-1" role="status" data-placeholder>
            {failed ? say('press.sheet.failed') : refs.length ? say('press.sheet.loading') : say('press.sheet.choose', { example })}
          </p>
        )}
        {sheet && (
          <button type="button" className="mt-3 min-h-11 w-full rounded-md border border-primary bg-primary text-step-2 font-bold text-primary-foreground" onClick={() => window.print()} data-print>
            {say('press.sheet.print')}
          </button>
        )}
      </div>
      {sheet && (
        <section className="sheet mt-3" data-sheet-page aria-label={sheet.name}>
          <div className="sheet__chart [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: sheet.svg }} />
          <div className="sheet__foot mt-3 flex items-center gap-4">
            <div className="sheet__qr [&>svg]:block [&>svg]:h-[120px] [&>svg]:w-[120px]" dangerouslySetInnerHTML={{ __html: sheet.qr }} />
            <p className="text-step-1">{say('press.sheet.qr')}</p>
          </div>
          <p className="sheet__source mt-2 text-step-1 text-muted-foreground" data-component="source-footer">
            {say(fixture ? 'press.poster.source.fixture' : 'press.poster.source', { edition, address: sheet.address })}
          </p>
        </section>
      )}
    </div>
  )
}
