import { useEffect, useMemo } from 'react'
import ShareActions from '@/components/ShareActions'
import { useIslandReady } from '@/components/use-island-ready'
import { usePlaceCards } from '@/components/use-place-cards'
import { DEFAULT_VOICE, message } from '@/lib/sentences/catalog'
import { stickerContent } from '@/lib/sticker-content'

/**
 * The Meu Brasil sticker (#37): from the places of the address, the one-line headline of the card and a QR code to the card, as a
 * transparent PNG for a story or a poster. The preview sits on a checkerboard so the transparency is visible; the download and the
 * share go through the existing flow. The words come from the same function as the card's headline.
 */
export interface MeuBrasilStickerProps {
  base: string
  origin: string
  fixture: boolean
  edition: string
}

const CHECKER = 'bg-[length:40px_40px] bg-[linear-gradient(45deg,var(--c-paper-2)_25%,transparent_25%,transparent_75%,var(--c-paper-2)_75%),linear-gradient(45deg,var(--c-paper-2)_25%,#fff_25%,#fff_75%,var(--c-paper-2)_75%)] [background-position:0_0,20px_20px]'

export default function MeuBrasilSticker({ base, origin, fixture, edition }: MeuBrasilStickerProps) {
  const { refs, cards, failed, parsed } = usePlaceCards(base)
  const island = useIslandReady('meu-brasil-sticker')
  const sticker = useMemo(() => (cards.length ? stickerContent(cards, { origin, base, fixture, edition }) : undefined), [cards, origin, base, fixture, edition])

  // data-ready (#122): yes once the sticker is drawn, or right away when the address names no place; a
  // shard that cannot be read is the terminal failure.
  useEffect(() => {
    if (!parsed) return
    if (failed) return island.markFailed('city shard')
    if (sticker || refs.length === 0) island.markReady()
  }, [parsed, failed, sticker, refs.length, island.markReady, island.markFailed])

  return (
    <div data-sticker-page data-ready={island.dataReady} data-error={island.dataError} data-places={cards.length}>
      <div className={`mt-3 flex justify-center overflow-hidden rounded-md border border-border py-4 ${CHECKER}`} data-checker>
        {sticker ? (
          <div className="w-[190px] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" data-sticker-picture dangerouslySetInnerHTML={{ __html: sticker.svg }} />
        ) : (
          <p className="my-16 rounded bg-background px-3 py-2 text-step-1" data-placeholder role="status">
            {failed ? 'Não foi possível carregar os dados de um dos lugares agora.' : refs.length ? 'Carregando…' : message(DEFAULT_VOICE, 'mb.none')}
          </p>
        )}
      </div>
      {sticker && (
        <>
          <ShareActions text={`${sticker.headline} ${sticker.url}`} svg={sticker.svg} filename={sticker.filename} link={sticker.url} primaryLabel="Compartilhar" downloadLabel={message(DEFAULT_VOICE, 'mb.sticker.download')} downloadFirst compact />
          <p className="mt-1 text-center text-step-1 text-muted-foreground" data-alt>{message(DEFAULT_VOICE, 'mb.sticker.altLabel', { alt: sticker.alt })}</p>
        </>
      )}
      <p className="mt-2 text-center text-step-1 text-muted-foreground" data-note>{message(DEFAULT_VOICE, 'mb.sticker.note')}</p>
    </div>
  )
}
