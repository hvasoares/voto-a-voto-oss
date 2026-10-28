import { useEffect, useMemo, useState } from 'react'
import { useCityShards } from '@/components/use-city-shards'
import { cityShardResult } from '@/lib/city-shard'
import { overlayFigure, parseOverlay, sealText, type OverlayConfig } from '@/lib/overlay'
import { DEFAULT_VOICE, message, type MessageKey } from '@/lib/sentences/catalog'
import '@/lib/sentences/catalog-overlay'
import { shortAddress } from '@/lib/share-text'
import { cityUrl } from '@/lib/share-url'
import { displayName } from '@/shared/city-search'

/**
 * The overlay of the OBS browser source (#68): one big number and the sentence that reads it, over the background the address asks for (transparent: the page paints nothing
 * outside the card, so the stream shows through), and the source seal, which is always printed. Static: it reads the city's own shard once and draws; no login, no
 * polling, no analytics (this file does not import it), no request beyond the site's own files. It fills whatever size the browser source gives it (1920x1080, 1280x720, 600x200).
 */
export interface OverlayViewProps {
  base: string
  origin: string
  edition: string
  fixture: boolean
}

const say = (key: string) => message(DEFAULT_VOICE, key as MessageKey)

const PALETTE = {
  transparente: { page: 'transparent', card: '#faf7f0', ink: '#1c1b18', muted: '#6a6558' },
  escuro: { page: '#1c1b18', card: '#2a2926', ink: '#faf7f0', muted: '#d5cfbf' },
  claro: { page: '#faf7f0', card: '#f1ecdf', ink: '#1c1b18', muted: '#6a6558' },
} as const

export default function OverlayView({ base, origin, edition, fixture }: OverlayViewProps) {
  const [config, setConfig] = useState<OverlayConfig>()
  useEffect(() => setConfig(parseOverlay(location.search)), [])
  const shards = useCityShards(base, config?.city ? [config.city] : [])
  const shard = config?.city ? shards[config.city] : undefined
  const loaded = shard && shard !== 'loading' && shard !== 'failed' ? shard : undefined
  const palette = PALETTE[config?.background ?? 'transparente']

  useEffect(() => {
    document.documentElement.style.background = palette.page
    document.body.style.background = palette.page
  }, [palette.page])

  const figure = useMemo(
    () => (loaded && config ? overlayFigure(cityShardResult(loaded, config.ano, config.turno), config, displayName(loaded.city.nome)) : undefined),
    [loaded, config],
  )
  const address = loaded ? shortAddress(cityUrl(origin, base, loaded.city.uf, loaded.city.slug)) : shortAddress(origin)
  const status = !config ? undefined : !config.city ? say('overlay.invalid') : shard === 'failed' ? say('overlay.failed') : !figure ? say('overlay.loading') : undefined

  return (
    <div data-overlay data-ready={figure ? 'yes' : 'no'} data-background={config?.background ?? 'transparente'} style={{ position: 'fixed', inset: 0, color: palette.ink, fontFamily: 'Helvetica Neue, Arial, sans-serif', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: '3vmin', background: palette.card, borderLeft: '1.6vmin solid #14505c', borderRadius: '1vmin', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2.5vmin 3.5vmin', boxSizing: 'border-box' }}>
        {figure ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3.5vmin', flex: 1, minHeight: 0 }}>
            <span data-big style={{ fontFamily: 'Iowan Old Style, Georgia, serif', fontSize: 'min(34vh, 16vw)', lineHeight: 1, color: palette.page === 'transparent' || palette.page === '#faf7f0' ? '#14505c' : '#8fd0dc', whiteSpace: 'nowrap' }}>{figure.big}</span>
            <span data-sentence style={{ fontFamily: 'Iowan Old Style, Georgia, serif', fontSize: 'min(9vh, 3.2vw)', lineHeight: 1.25 }}>{figure.sentence}</span>
          </div>
        ) : (
          <p data-status role="status" style={{ margin: 0, fontSize: 'min(8vh, 3vw)' }}>{status ?? ''}</p>
        )}
        <p data-seal style={{ margin: 0, paddingTop: '1.2vmin', fontSize: 'min(4.4vh, 1.6vw)', lineHeight: 1.2, color: palette.muted }}>{sealText({ edition, address, fixture })}</p>
      </div>
    </div>
  )
}
