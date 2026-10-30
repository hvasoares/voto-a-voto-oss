/**
 * THE loader of the lighter-site milestone (private#207): the one client module that fetches a page's data file, checks it with `validatePageData`
 * (private#205) and draws it into the stub's area (`[data-stub-area]` of `components/PageStub.astro`). No family writes its own fetch.
 *
 * It holds no sentences: the stub hands the three it needs as `data-arrived`, `data-failed-text` and `data-retry-text` on the area (from the catalog).
 *  - success: `draw(payload, host)` fills a `<div data-stub-content>` inside the area; `data-ready="yes"`; the loading line says the arrival, in the
 *    area's polite status role;
 *  - missing file (HTTP error or no network), bad JSON, wrong shape or bad checksum: `data-ready="no"`, `data-error=<reason>`, the terminal
 *    `data-failed` (the shared `markIslandFailed`), the failure sentence and a retry button; the link back is the stub's own `[data-stub-back]`;
 *  - retry loads again from the start. The focus is never moved by the loader.
 */
import { validatePageData } from '@/shared/page-data'
import { markIslandFailed } from '../../integrations/island-failed.js'

/** A file that is not a page-data file (the city's shard, which other pages already serve) is read by its own check: the data, or why it is refused. */
export type SourceCheck<T> = (json: unknown) => { ok: true; data: T } | { ok: false; error: string }

export interface PageDataLoad<T = unknown> {
  area: HTMLElement
  /** The URL of the data file. */
  url: string
  /** What the file must say it is (`family` and `path`): a file for another page is refused. */
  family: string
  path: string
  draw: (data: T, host: HTMLElement) => void
  /** Reads a file that has no page-data envelope (private#216: the city shard); `family` and `path` are then not checked in the file. */
  check?: SourceCheck<T>
  fetcher?: typeof fetch
}

const asData = <T>(c: ReturnType<typeof validatePageData>): ReturnType<SourceCheck<T>> => (c.ok ? { ok: true, data: c.file.data as T } : c)

export function loadPageData<T = unknown>({ area, url, family, path, draw, check: readFile, fetcher = fetch }: PageDataLoad<T>): Promise<void> {
  const line = area.querySelector<HTMLElement>('[data-stub-loading]') ?? area.appendChild(document.createElement('p'))
  let busy = false
  const fail = (reason: string) => {
    area.dataset.ready = 'no'
    area.dataset.error = reason
    markIslandFailed(area, { reveal: false })
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.className = 'mt-3 block min-h-11 text-step-2 text-primary underline'
    retry.textContent = area.dataset.retryText ?? ''
    retry.onclick = () => void run()
    line.textContent = area.dataset.failedText ?? ''
    line.append(retry)
  }
  const run = async () => {
    if (busy) return
    busy = true
    area.dataset.ready = 'no'
    delete area.dataset.error
    delete area.dataset.failed
    try {
      const res = await fetcher(url).catch(() => undefined)
      if (!res?.ok) return fail(`http ${res?.status ?? 'none'}`)
      const json: unknown = await res.json().catch(() => undefined)
      if (json === undefined) return fail('bad json')
      const check = readFile ? readFile(json) : asData<T>(validatePageData(json, { family, path }))
      if (!check.ok) return fail(check.error)
      area.querySelector('[data-stub-content]')?.remove()
      const host = area.appendChild(document.createElement('div'))
      host.dataset.stubContent = ''
      draw(check.data, host)
      line.textContent = area.dataset.arrived ?? ''
      area.dataset.ready = 'yes'
    } finally {
      busy = false
    }
  }
  return run()
}
