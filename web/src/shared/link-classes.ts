/**
 * The repeated link class strings of ticket #113 (owner rule: more than two copies of a pattern is in scope).
 * One token per variant; a page adopts a token by substitution only, never by rewording the string — the
 * rendered HTML is byte-identical before and after, which the html-diff tool of #113 proves per migration.
 *
 * Census of 2026-10-29 (by script, recorded in the #113 checkpoint — grep under web/src for the prefixes):
 *  - NAV_CHIP_QUIET:         16 copies (the "‹ Início" back chip that merges into text links from lg up)
 *  - NAV_CHIP_QUIET_PRIMARY: 11 copies (the same chip ending in lg:text-primary)
 *  - NAV_CHIP:                1 copy   (mapa/[uf]: the chip that keeps its border from lg up)
 * QrScreen's QR link recomposes the same utilities in a different order (a print QR chip) and stays local.
 * #114/#115/#116 migrate the copies; #117 guards against new ones. The 44 px tap target (#19) is `min-h-11`.
 */

/** The bordered chip link: a 44 px tap target with the shared control radius (`rounded-md` = --radius). */
export const NAV_CHIP = 'inline-flex min-h-11 items-center rounded-md border border-border px-3 text-step-2 font-bold'

/** NAV_CHIP plain text from 1024 px up (the desktop renders the same link as quiet body text). */
export const NAV_CHIP_QUIET = `${NAV_CHIP} lg:min-h-8 lg:border-0 lg:px-0 lg:text-step-1 lg:font-normal`

/** NAV_CHIP_QUIET in the primary (link) colour from 1024 px up. */
export const NAV_CHIP_QUIET_PRIMARY = `${NAV_CHIP_QUIET} lg:text-primary`

/**
 * The plain footer/global-line link (no border): the "Sobre os dados ›" of the page footers and the links of
 * the global footer lines (Edição, Privacidade, Apoie o projeto, Relatórios, Mapa por estado) — 27 copies of
 * the same string before #113 (census above). The SiteFooter component builds its links with this token, so the
 * pilot page of #113 (the city card) already renders it from here.
 */
export const FOOTER_LINK = 'inline-flex min-h-11 items-center'
