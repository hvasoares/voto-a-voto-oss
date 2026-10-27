import { describe, expect, it } from 'vitest'
import { pickMethod, performShare, type ShareNavigator } from './share-flow'

/** A PNG File stub for pickMethod. */
const png = new File(['x'], 'voto-a-voto.png', { type: 'image/png' })

const shareNav = (share?: () => Promise<void>, canShare?: (d: ShareData) => boolean): ShareNavigator => ({ ...(share ? { share } : {}), ...(canShare ? { canShare } : {}) })

describe('pickMethod', () => {
  it('files when the navigator can share files', () => {
    const nav = shareNav(async () => {}, (d) => !!d.files)
    expect(pickMethod(nav, png)).toBe('files')
    expect(pickMethod(nav, undefined)).toBe('download')
  })

  it('text when it shares but not files', () => {
    const nav = shareNav(async () => {}, () => false)
    expect(pickMethod(nav, png)).toBe('download')
  })

  it('text when sharing exists but canShare says nothing; download without a share API', () => {
    expect(pickMethod(shareNav(async () => {}), png)).toBe('text')
    expect(pickMethod(shareNav(async () => {}), undefined)).toBe('text')
    expect(pickMethod(shareNav(undefined) as ShareNavigator, undefined)).toBe('download')
  })
})

describe('performShare', () => {
  it('shares the file and the text with the method used; the navigator.share call is synchronous (inside the tap)', async () => {
    const calls: ShareData[] = []
    const r = await performShare({
      nav: shareNav((d) => {
        calls.push(d)
        return Promise.resolve()
      }, (d) => !!d.files),
      file: png,
      text: 'x',
      download: () => {
        throw new Error('should not download')
      },
    })
    expect(r).toEqual({ method: 'files', status: 'shared' })
    expect(calls[0]).toMatchObject({ files: [png], text: 'x' })
  })

  it('a cancelled sheet is silent and downloads nothing', async () => {
    let downloads = 0
    const r = await performShare({ nav: shareNav(() => Promise.reject(new DOMException('cancelled', 'AbortError')), () => true), file: png, text: 'x', download: () => void downloads++ })
    expect(r).toEqual({ method: 'files', status: 'cancelled' })
    expect(downloads).toBe(0)
  })

  it('a failed share falls back to the download and says so', async () => {
    let downloads = 0
    const r = await performShare({ nav: shareNav(() => Promise.reject(new Error('no')), () => true), file: png, text: 'x', download: () => void downloads++ })
    expect(r).toEqual({ method: 'files', status: 'failed', fellBack: 'download' })
    expect(downloads).toBe(1)
  })

  it('with no share API at all, it is a plain download', async () => {
    let downloads = 0
    const r = await performShare({ nav: shareNav(), file: png, text: 'x', download: () => void downloads++ })
    expect(r).toEqual({ method: 'download', status: 'downloaded' })
    expect(downloads).toBe(1)
  })

  it('a download that fails is a failed share, never an unhandled error', async () => {
    const r = await performShare({ nav: shareNav(async () => {}, () => false), file: png, text: 'x', download: () => Promise.reject(new Error('no')) })
    expect(r).toEqual({ method: 'download', status: 'failed' })
  })

  it('shares text only when there is no file (the picture could not be made)', async () => {
    const shared: ShareData[] = []
    const r = await performShare({ nav: shareNav((d) => (shared.push(d) ? Promise.resolve() : Promise.resolve()), () => true), file: undefined, text: 'x', download: () => undefined })
    expect(r).toEqual({ method: 'text', status: 'shared' })
    expect(shared[0]).toEqual({ text: 'x' })
  })
})