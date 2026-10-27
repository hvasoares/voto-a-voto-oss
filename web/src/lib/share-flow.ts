/**
 * What happens when "Compartilhar" is tapped, free of the DOM so it can be tested with fakes.
 *
 * IMPORTANT (iOS Safari): `navigator.share` must be called inside the tap, before any await. The PNG is therefore made
 * ahead of time (the ShareSheet island rasterises it right after it hydrates) and `performShare` reaches
 * `navigator.share` synchronously.
 *
 *   files     navigator.canShare({files:[png]}) -> navigator.share({files:[png], text})
 *   text      sharing exists but not files        -> navigator.share({text})
 *   download  no sharing at all                   -> the PNG is downloaded (the page shows the text with a copy button)
 * A cancelled sheet (AbortError) is silent. Any other failure falls back to the download. Nothing is thrown.
 */
export interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
}
export type ShareMethod = 'files' | 'text' | 'download'
export type ShareStatus = 'shared' | 'downloaded' | 'cancelled' | 'failed'
export interface ShareResult {
  method: ShareMethod
  status: ShareStatus
  /** Set when the share failed and the image was downloaded instead. */
  fellBack?: 'download'
}

export function pickMethod(nav: ShareNavigator, file: File | undefined): ShareMethod {
  if (typeof nav.share !== 'function') return 'download'
  if (file && nav.canShare?.({ files: [file] })) return 'files'
  return nav.canShare && nav.canShare({ text: 'x' }) === false ? 'download' : 'text'
}

const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError'

export interface PerformShareOptions {
  nav: ShareNavigator
  /** The PNG, already made. Undefined when it could not be made. */
  file: File | undefined
  /** Message text, with the page address. */
  text: string
  /** Saves the image (or whatever can be saved). */
  download: () => Promise<void> | void
}

export async function performShare({ nav, file, text, download }: PerformShareOptions): Promise<ShareResult> {
  const method = pickMethod(nav, file)
  const doDownload = async (): Promise<boolean> => {
    try {
      await download()
      return true
    } catch {
      return false
    }
  }
  if (method === 'download') return { method, status: (await doDownload()) ? 'downloaded' : 'failed' }
  try {
    // No await before this call: it must happen inside the user's tap.
    await nav.share!(method === 'files' ? { files: [file!], text } : { text })
    return { method, status: 'shared' }
  } catch (e) {
    if (isAbort(e)) return { method, status: 'cancelled' }
    return (await doDownload()) ? { method, status: 'failed', fellBack: 'download' } : { method, status: 'failed' }
  }
}