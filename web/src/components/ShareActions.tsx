import { useEffect, useRef, useState } from 'react'
import { getAnalytics } from '@/analytics'
import { Button } from '@/components/ui/button'
import { performShare, type ShareNavigator } from '@/lib/share-flow'
import { saveBlob, svgToPng } from '@/lib/share-raster'

/**
 * The interactive part of the share sheet (ticket #7): the "Compartilhar" / "Baixar imagem" buttons, "Copiar texto"
 * and the status line. The picture preview, the note and the message text are Astro markup around this island, so they
 * work without JavaScript (the buttons are pre-rendered hidden; only this island, when it runs, shows them).
 *
 * The PNG is made as soon as the island hydrates (client:idle), NOT on tap: `navigator.share` must be reached inside
 * the user gesture on iOS Safari, so the picture has to exist already. A tap that has to wait for hydration would miss
 * the gesture, which is why the island is NOT `client:interaction`.
 */
export interface ShareActionsProps {
  /** The message text, with the page address (scheme included): what "Compartilhar" sends and the copy button copies. */
  text: string
  /** The serialized SVG of the picture, the same the page shows pre-rendered. */
  svg: string
  /** `voto-a-voto-rj-cidade-exemplo-2026-turno-1.png` (ASCII). */
  filename: string
}

const MESSAGES = {
  downloaded: 'Imagem baixada. O texto da mensagem está logo abaixo.',
  fellBack: 'Não foi possível abrir o compartilhamento. A imagem foi baixada.',
  failed: 'Não foi possível compartilhar agora. Tente "Baixar imagem".',
  downloadFailed: 'Não foi possível baixar a imagem.',
  copied: 'Texto copiado.',
  copyFailed: 'Não foi possível copiar. Selecione o texto e copie.',
} as const

const BTN = 'min-h-11 w-full rounded-md text-body font-bold'
const BTN_OUTLINE = `${BTN} border border-border bg-background text-foreground`

export default function ShareActions({ text, svg, filename }: ShareActionsProps) {
  const [mounted, setMounted] = useState(false)
  const [status, setStatus] = useState('')
  const [file, setFile] = useState<File>()
  const [pngState, setPngState] = useState<'pending' | 'ready' | 'failed'>('pending')
  const readyRef = useRef<Promise<File | undefined>>(Promise.resolve(undefined))

  useEffect(() => {
    setMounted(true)
    getAnalytics().event('share_opened', { has_picture: true })
    const ready = svgToPng(svg, filename)
    readyRef.current = ready
    void ready.then(
      (f) => {
        setFile(f)
        setPngState(f ? 'ready' : 'failed')
      },
      () => setPngState('failed'),
    )
  }, [svg, filename])

  const show = (when: boolean) => (when ? {} : { hidden: true })

  /** Saves the picture (or, when it could not be made, the SVG itself). Used by the button and by the share fallback. */
  const download = async () => {
    const f = file ?? (await readyRef.current)
    if (f) saveBlob(f, f.name)
    else saveBlob(new Blob([svg], { type: 'image/svg+xml' }), filename.replace(/\.png$/, '.svg'))
  }

  const onShare = () => {
    void performShare({ nav: navigator as ShareNavigator, file, text, download }).then((r) => {
      if (r.status === 'shared') getAnalytics().event('share_completed', { method: r.method })
      if (r.status === 'cancelled') getAnalytics().event('share_cancelled')
      // The fallback download of a failed share also counts as an image download.
      if (r.status === 'downloaded') getAnalytics().event('image_downloaded', { how: r.method === 'download' ? 'no_share_api' : 'share_fallback' })
      if (r.status === 'failed' && r.fellBack) getAnalytics().event('image_downloaded', { how: 'share_fallback' })
      if (r.status === 'failed' && !r.fellBack) getAnalytics().event('share_failed', { method: r.method })
      if (r.status === 'downloaded') setStatus(MESSAGES.downloaded)
      else if (r.status === 'failed') setStatus(r.fellBack ? MESSAGES.fellBack : r.method === 'download' ? MESSAGES.downloadFailed : MESSAGES.failed)
      else setStatus('')
    })
  }

  const onDownload = () => {
    void download().then(
      () => {
        getAnalytics().event('image_downloaded', { how: 'download_button' })
        setStatus(MESSAGES.downloaded)
      },
      () => setStatus(MESSAGES.downloadFailed),
    )
  }

  const onCopy = () => {
    const write = async () => {
      await navigator.clipboard.writeText(text)
    }
    void write().then(
      () => setStatus(MESSAGES.copied),
      () => setStatus(MESSAGES.copyFailed),
    )
  }

  return (
    <>
      <div className="mt-3 grid gap-2" data-share-actions data-png={pngState}>
        <Button className={BTN} {...show(mounted)} onClick={onShare} data-act="share">
          Compartilhar
        </Button>
        <Button variant="outline" className={BTN_OUTLINE} {...show(mounted)} onClick={onDownload} data-act="download">
          Baixar imagem
        </Button>
        <p className="min-h-6 text-small leading-[17px] text-muted-foreground" role="status" aria-live="polite" data-status>
          {status}
        </p>
      </div>
      <div className="mt-1 border-t border-border pt-2" data-share-text data-text={text}>
        <h2 className="text-small font-bold leading-[17px]">Texto da mensagem</h2>
        <p className="mt-1 text-body leading-[18px] wrap-anywhere" data-text-body>
          {text}
        </p>
        <Button variant="outline" className={`${BTN_OUTLINE} mt-2 min-h-9 text-small`} {...show(mounted && !!navigator.clipboard)} onClick={onCopy} data-act="copy">
          Copiar texto
        </Button>
      </div>
    </>
  )
}