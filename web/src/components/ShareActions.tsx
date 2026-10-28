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
  /** The city's address (scheme included): what "Copiar link" copies where the browser has no system share sheet. */
  link: string
  /** The label of the native share button ("Compartilhar" by default; the recap says "Compartilhar o resumo"). */
  primaryLabel?: string
  /** Hides the message text block only (the story's frame shows the two actions and no text); `compact` also drops the download where the system sheet exists. */
  textHidden?: boolean
  /** One primary action only: no message text, and "Baixar imagem" only where the browser has no system share sheet (the recap's frame). */
  compact?: boolean
  /** The label of the download button ("Baixar imagem" by default). */
  downloadLabel?: string
  /** The download comes first, as the primary action, and stays even where the system sheet exists (the sticker's frame). */
  downloadFirst?: boolean
  /** A screen's own counters, called besides the share ones: when the actions open and when a share completes (#28's recap_opened, recap_shared). */
  onOpened?: () => void
  onShared?: () => void
}

const MESSAGES = {
  downloaded: 'Imagem baixada. O texto da mensagem está logo abaixo.',
  fellBack: 'Não foi possível abrir o compartilhamento. A imagem foi baixada.',
  failed: 'Não foi possível compartilhar agora. Tente "Baixar imagem".',
  downloadFailed: 'Não foi possível baixar a imagem.',
  copied: 'Texto copiado.',
  linkCopied: 'Link copiado.',
  linkCopyFailed: 'Não foi possível copiar. Selecione o endereço e copie.',
  copyFailed: 'Não foi possível copiar. Selecione o texto e copie.',
} as const

const BTN = 'min-h-11 w-full rounded-md text-body font-bold'
const BTN_PRIMARY = `${BTN} text-primary-foreground`
const BTN_OUTLINE = `${BTN} border border-border bg-background text-foreground`

export default function ShareActions({ text, svg, filename, link, primaryLabel = 'Compartilhar', downloadLabel = 'Baixar imagem', downloadFirst = false, compact = false, textHidden = false, onOpened, onShared }: ShareActionsProps) {
  const [mounted, setMounted] = useState(false)
  // Feature-detected after hydration (the server cannot know): where the browser has no Web Share API (most desktop
  // browsers) the native share button is hidden and "Copiar link" takes its place (#52).
  const [canShare, setCanShare] = useState(true)
  const [status, setStatus] = useState('')
  const [file, setFile] = useState<File>()
  const [pngState, setPngState] = useState<'pending' | 'ready' | 'failed'>('pending')
  const readyRef = useRef<Promise<File | undefined>>(Promise.resolve(undefined))
  // The picture can change under the actions (Meu Brasil redraws it for every place): the opening is counted once.
  const opened = useRef(false)

  useEffect(() => {
    setMounted(true)
    setCanShare(typeof navigator.share === 'function')
    if (!opened.current) {
      opened.current = true
      getAnalytics().event('share_opened', { has_picture: true })
      onOpened?.()
    }
    // The picture can change while an earlier one is still being rasterised (Meu Brasil draws the card with the first place, then again
    // with both): a slow earlier PNG must never replace the newer one, so a changed picture starts over as pending and only the
    // latest rasterisation may set the file and the state.
    setFile(undefined)
    setPngState('pending')
    let current = true
    const ready = svgToPng(svg, filename)
    readyRef.current = ready
    void ready.then(
      (f) => {
        if (!current) return
        setFile(f)
        setPngState(f ? 'ready' : 'failed')
      },
      () => current && setPngState('failed'),
    )
    return () => {
      current = false
    }
  }, [svg, filename])

  const show = (when: boolean) => (when ? {} : { hidden: true })

  /** Saves the picture (or, when it could not be made, the SVG itself). Used by the button and by the share fallback. */
  const download = async () => {
    const f = await readyRef.current
    if (f) saveBlob(f, f.name)
    else saveBlob(new Blob([svg], { type: 'image/svg+xml' }), filename.replace(/\.png$/, '.svg'))
  }

  const onShare = () => {
    void performShare({ nav: navigator as ShareNavigator, file, text, download }).then((r) => {
      if (r.status === 'shared') {
        getAnalytics().event('share_completed', { method: r.method })
        onShared?.()
      }
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

  const onCopyLink = () => {
    void navigator.clipboard.writeText(link).then(
      () => setStatus(MESSAGES.linkCopied),
      () => setStatus(MESSAGES.linkCopyFailed),
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
        {!canShare && (
          <p className="text-small leading-[17px] text-muted-foreground" data-no-share>
            Este navegador não oferece o compartilhamento do sistema. Copie o link ou baixe a imagem.
          </p>
        )}
        <Button variant={downloadFirst ? 'outline' : undefined} className={downloadFirst ? BTN_OUTLINE : BTN_PRIMARY} {...show(mounted && canShare)} onClick={onShare} data-act="share">
          {primaryLabel}
        </Button>
        <Button className={BTN_PRIMARY} {...show(mounted && !canShare && !!navigator.clipboard)} onClick={onCopyLink} data-act="copy-link">
          Copiar link
        </Button>
        <Button variant={downloadFirst ? undefined : 'outline'} className={downloadFirst ? `${BTN_PRIMARY} order-first` : BTN_OUTLINE} {...show(mounted && !(compact && canShare && !downloadFirst))} onClick={onDownload} data-act="download">
          {downloadLabel}
        </Button>
        <p className="min-h-6 text-small leading-[17px] text-muted-foreground" role="status" aria-live="polite" data-status>
          {status}
        </p>
      </div>
      {/* Without a system share sheet the desktop dialog is just the three actions of the frame; a narrow screen keeps the message text. */}
      <div className={`mt-1 border-t border-border pt-2 ${canShare ? '' : 'lg:hidden'}`} hidden={compact || textHidden} data-share-text data-text={text}>
        <h2 className="text-small font-bold leading-[17px]">Texto da mensagem</h2>
        <p className="mt-1 text-body leading-[18px] wrap-anywhere" data-text-body>
          {text}
        </p>
        <Button variant="outline" className={`${BTN_OUTLINE} mt-2 min-h-11 text-small`} {...show(mounted && !!navigator.clipboard)} onClick={onCopy} data-act="copy">
          Copiar texto
        </Button>
      </div>
    </>
  )
}