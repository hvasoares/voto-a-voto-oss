/**
 * The page shell's class strings (ticket #136): the `<main>` column and the page footer's column that about twenty-five pages
 * wrote out by hand (the 430 px phone column, widened at md and lg). `components/PageMain.astro` and the footers draw from here,
 * so the width token `max-w-[430px]` lives in this file and in a few named singles (see `shared/page-shell.test.ts`).
 *
 * Tailwind finds a utility only as a WHOLE literal in the source, so every variant is written out below in full and picked by
 * name; nothing is assembled from fragments. A new width is a new line here, never a string in a page.
 */

/** The phone column every page draws in: centred, at most 430 px, the gutter of the type scale. */
const COLUMN = 'mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5'

/** Top padding of `<main>`: `bar` clears the fixed phone bar (no header of the page's own), `header` sits under the phone header. */
const TOP = { bar: 'pt-16', header: 'pt-3' } as const

/** The width the column grows to from 768 px up (md). Absent: it stays 430 px. */
const MD = {
  '480': 'md:max-w-[480px]',
  '720': 'md:max-w-[720px]',
  '760': 'md:max-w-[760px]',
  '880': 'md:max-w-[880px]',
} as const

/** The width from 1024 px up (lg). Absent: it stays at the md width. */
const LG = {
  '1200': 'lg:max-w-[1200px]',
  '1240': 'lg:max-w-[1240px]',
} as const

export type MainTop = keyof typeof TOP
export type MainMd = keyof typeof MD
export type MainLg = keyof typeof LG

export interface MainShell {
  /** Default `header`. */
  top?: MainTop
  md?: MainMd
  lg?: MainLg
  /** The two-column grid from 1024 px (the map pages). */
  grid?: boolean
  /** Bottom padding `pb-2` under the content (default false). */
  padBottom?: boolean
  /** The desktop top padding `lg:pt-8` that makes room for the top bar (default true; one map page has none). */
  deskTop?: boolean
  /** Extra utility classes that are the page's own, appended last (a marker class, a gutter reset). */
  extra?: string
}

/** The class of a page's `<main>`, tokens in one fixed order. Pure. */
export function mainClass({ top = 'header', md, lg, grid = false, padBottom = false, deskTop = true, extra }: MainShell = {}): string {
  return [COLUMN, TOP[top], padBottom && 'pb-2', md && MD[md], grid && 'lg:grid', lg && LG[lg], deskTop && 'lg:pt-8', extra].filter(Boolean).join(' ')
}

/** The footer's column variants: the md width, the lg width and its bottom padding. */
const FOOTER_MD = { '760': 'md:max-w-[760px]' } as const
const FOOTER_LG = { '1200': 'lg:max-w-[1200px]' } as const

export interface FooterShell {
  md?: keyof typeof FOOTER_MD
  lg?: keyof typeof FOOTER_LG
  /** Bottom padding: `pb-6` (default) or the compact `pb-2` of the long page. */
  pad?: 'normal' | 'compact'
  /** `lg:text-left` from 1024 px (the wide list). */
  leftFromDesktop?: boolean
}

/** The class of the border-topped page footer under a page's content. Pure. */
export function footerClass({ md, lg, pad = 'normal', leftFromDesktop = false }: FooterShell = {}): string {
  return [
    'mx-auto mt-2 w-full max-w-[430px]',
    md && FOOTER_MD[md],
    lg && FOOTER_LG[lg],
    'border-t border-border px-5',
    pad === 'normal' ? 'pb-6' : 'pb-2',
    'pt-2 text-center text-step-1 text-primary',
    leftFromDesktop && 'lg:text-left',
  ]
    .filter(Boolean)
    .join(' ')
}

/** The footer line of QuietDoc: the global line on a page with no border above it, in the same phone column. */
export const QUIET_FOOTER_CLASS = 'mx-auto w-full max-w-[430px] px-5 pb-6 pt-2 text-center text-step-1'
