/**
 * The share-sheet mock of #134: the one place `navigator.share` / `navigator.canShare` are redefined for e2e.
 * A real system sheet cannot be driven by Playwright, so specs install a mode and read back what the product sent.
 * `no-raw-share.test.ts` fails when a spec redefines them by hand; this file is the one it never scans.
 *
 * Modes (decided by the owner on 2026-10-28):
 * - `shares`      share() resolves; canShare() is true for files and for text
 * - `shares-text` share() resolves; canShare() is false when `data.files` is set (a browser that shares text only)
 * - `fails`       share() rejects with NotAllowedError (the product falls back to the download)
 * - `cancelled`   share() rejects with AbortError (a normal user cancel; the product must stay silent)
 * - `absent`      `share` and `canShare` are both undefined
 *
 * Every call is recorded in sessionStorage under one key, so the list survives a same-origin navigation and a
 * reload (`calls()` re-reads it from the page every time; `reset()` clears it). Cross-origin navigations are NOT
 * supported: sessionStorage is per origin, so the list of the first origin is not visible from the second.
 *
 * Readiness: the init script sets `document.documentElement.dataset.shareMock = '<mode>'` before any page script
 * runs. `ready()` waits for that attribute AND for the island to hydrate; `calls()` asked on a document that does
 * not carry the attribute fails with `share mock not installed (mode <m>)` instead of timing out.
 *
 * Two spellings of one implementation: the Playwright fixture `share` (import `test` from this file) and
 * `shareMock(page)` for the specs whose own `open()` helper owns the page (or that build pages from a context).
 */
import { expect, test as base, type Page } from '@playwright/test'

export const SHARE_MODES = ['shares', 'shares-text', 'fails', 'cancelled', 'absent'] as const
export type ShareMode = (typeof SHARE_MODES)[number]

/** The sessionStorage key of the recorded calls. */
export const SHARE_CALLS_KEY = 'voto-a-voto:e2e-share-calls'

/** What the product handed to `navigator.share`, in call order. */
export interface ShareCall {
  files: { name: string; type: string; size: number }[]
  text?: string
  url?: string
  title?: string
  /** `navigator.userActivation.isActive` at the moment of the call: the share happened inside the tap */
  active: boolean
  /** present once the first file's bytes were read: the PNG header */
  png?: { width: number; height: number; signature: string }
}

/** The dataset value the init script writes on the document element. */
export const SHARE_ATTRIBUTE = 'shareMock'

/** The failure `calls()` raises when the mock is not on the current document. */
export const notInstalled = (mode: ShareMode | undefined): string => `share mock not installed (mode ${mode ?? 'none chosen'})`

/** Runs in the page before any script of every document (serialised by addInitScript: no closures). */
function installInPage({ mode, key }: { mode: string; key: string }) {
  // An init script runs before the <html> element exists: mark it the moment the parser creates it.
  const mark = () => {
    if (!document.documentElement) return false
    document.documentElement.dataset.shareMock = mode
    return true
  }
  if (!mark()) {
    const observer = new MutationObserver(() => mark() && observer.disconnect())
    observer.observe(document, { childList: true })
  }
  const read = (): unknown[] => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? '[]') as unknown[]
    } catch {
      return []
    }
  }
  const write = (list: unknown[]) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(list))
    } catch {
      /* storage blocked: calls() will read an empty list */
    }
  }
  if (mode === 'absent') {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    return
  }
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d: ShareData) => (d.files ? mode !== 'shares-text' : true) })
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: (d: ShareData) => {
      const rec: Record<string, unknown> = {
        files: (d.files ?? []).map((f) => ({ name: f.name, type: f.type, size: f.size })),
        active: navigator.userActivation.isActive,
      }
      for (const field of ['text', 'url', 'title'] as const) if (d[field] !== undefined) rec[field] = d[field]
      const list = read()
      const index = list.length
      list.push(rec)
      write(list)
      const file = d.files?.[0]
      if (file)
        void file.arrayBuffer().then((b) => {
          const v = new DataView(b)
          const next = read()
          const own = next[index] as Record<string, unknown> | undefined
          if (own) {
            own.png = { width: v.getUint32(16), height: v.getUint32(20), signature: [...new Uint8Array(b, 0, 8)].join(',') }
            write(next)
          }
        })
      if (mode === 'cancelled') return Promise.reject(new DOMException('cancelled', 'AbortError'))
      if (mode === 'fails') return Promise.reject(new DOMException('no', 'NotAllowedError'))
      return Promise.resolve()
    },
  })
}

export interface ShareMock {
  /** Installs the mode for every document the page loads from now on; call it BEFORE `page.goto`. */
  install(mode: ShareMode): Promise<void>
  /** Waits for the mock on the current document and for the island to hydrate. */
  ready(): Promise<void>
  /** The recorded calls, in call order, re-read from the page. Throws `share mock not installed (mode <m>)` on a document without the mock. */
  calls(): Promise<ShareCall[]>
  /** Waits until at least `count` calls are recorded (and the first PNG header was read, when a file was shared), then returns them. */
  waitForCalls(count?: number): Promise<ShareCall[]>
  /** Empties the recorded list. */
  reset(): Promise<void>
}

const installed = new WeakMap<Page, ShareMode>()

export function shareMock(page: Page): ShareMock {
  const mockOnPage = () => page.evaluate((attr) => document.documentElement.dataset[attr], SHARE_ATTRIBUTE)
  const calls = async (): Promise<ShareCall[]> => {
    const mode = installed.get(page)
    if (!mode || (await mockOnPage()) !== mode) throw new Error(notInstalled(mode))
    return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) ?? '[]') as ShareCall[], SHARE_CALLS_KEY)
  }
  return {
    async install(mode) {
      installed.set(page, mode)
      await page.addInitScript(installInPage, { mode, key: SHARE_CALLS_KEY })
    },
    async ready() {
      const mode = installed.get(page)
      await page.waitForFunction(({ attr, want }) => document.documentElement.dataset[attr] === want, { attr: SHARE_ATTRIBUTE, want: mode }, { timeout: 5000 }).catch(() => {
        throw new Error(notInstalled(mode))
      })
      // The page is ready when its island hydrated, or, on a stub page (the city sheet, private#210), when the stub says its data arrived.
      await page.waitForFunction(() => {
        const island = document.querySelector('astro-island')
        return document.querySelector('[data-stub-area]')?.getAttribute('data-ready') === 'yes' || (!!island && !island.hasAttribute('ssr'))
      })
    },
    calls,
    async waitForCalls(count = 1) {
      await expect.poll(async () => {
        const list = await calls()
        return list.length >= count && list.slice(0, count).every((c) => c.files.length === 0 || c.png)
      }).toBe(true)
      return calls()
    },
    async reset() {
      await page.evaluate((key) => sessionStorage.removeItem(key), SHARE_CALLS_KEY)
    },
  }
}

/** `test` extended with the `share` fixture: `test('…', async ({ page, share }) => { await share.install('shares'); … })`. */
export const test = base.extend<{ share: ShareMock }>({
  share: async ({ page }, use) => {
    await use(shareMock(page))
  },
})

/** A line of a spec that redefines the share API by hand. */
export interface RawShareFinding {
  file: string
  /** 1-based. */
  line: number
  literal: string
}

// Fragments keep this file's own regexes from matching their own source text (it is the one file the lint skips).
const NAV = 'navigator'
const RAW_SHARE_PATTERNS: RegExp[] = [
  new RegExp(`Object\\.defineProperty\\(\\s*${NAV}\\s*,\\s*['"\`](?:share|canShare)['"\`]`, 'g'),
  new RegExp(`${NAV}\\.(?:share|canShare)\\s*=(?!=)`, 'g'),
  /\bcanShare\s*:/g,
  /(['"`])share\1\s*,\s*\{/g,
]

/** The pure half of the lint: every place in `source` that redefines navigator.share / canShare by hand (the match may span lines; the line is where it starts). */
export function findRawShareMocks(source: string, file: string): RawShareFinding[] {
  const found = new Map<number, RawShareFinding>()
  for (const pattern of RAW_SHARE_PATTERNS)
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split('\n').length
      if (!found.has(line)) found.set(line, { file, line, literal: source.split('\n')[line - 1]!.trim().slice(0, 100) })
    }
  return [...found.values()].sort((a, b) => a.line - b.line)
}
