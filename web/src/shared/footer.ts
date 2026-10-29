/**
 * The markup of the site's footers (ticket #113, expand step of the expand-migrate-contract refactor).
 * Pure builders with escaping (`html`): they render the same strings in a unit test and in the build, and the
 * SiteFooter component (src/components/SiteFooter.astro) is a thin shell over them — so the byte-identity the
 * ticket demands is checkable as plain string equality here and proven end-to-end by scripts/html-diff.ts.
 *
 * Two footers exist on a page (the footer inventory of #113 lists every variant found in the 44 files that
 * carry `<footer`, grouped below with the keep/migrate decision):
 *
 *  - the PAGE footer (`sourceFooter`): the per-page source line, a `<footer data-component="source-footer">`.
 *    Variants on main (44 files): the standard line ("Fonte: TSE, dados finais · Sobre os dados ›", ~35 pages
 *    in ~12 class spellings), the no-link source note (edicoes ×2, api), the keyboard-only about-link card
 *    variant (CityCard, the fact pages, cidade/tres-ciclos — the pilot's own), Home's "Dados oficiais do TSE",
 *    the sobre-os-dados line with the inline finality chip, mapa/[uf]'s IBGE credit, the game sentence from the
 *    catalog, and the nerds/print specials. Defaults below reproduce the PILOT's variant (the city card):
 *    class "source-footer", no visible separator, the keyboard-only `source-footer__about` link.
 *  - the GLOBAL lines (`globalFooterLines`): NOT a <footer> element (every page carries its own; the e2e specs
 *    resolve single-footer locators) — the Base.astro block (edition link #59, privacy link #20, donation link
 *    #36, the "Final, não ao vivo" chip #122 and the Relatórios/Mapa line #103) and the one QuietDoc line.
 *
 * Variant policy (binding for #114/#115/#116): a page whose footer a prop cannot reproduce byte-for-byte does
 * NOT get an ad-hoc local tweak — the component gains the variant here first, with its unit test, then the page
 * migrates. Kept local with a reason: the nerds panel definition list (dl, not a source line), the QrScreen
 * print line (paper sizing), and every no-footer document (embed/overlay/fragmentos carry none at all).
 */
import { html, raw } from './html'
import { FOOTER_LINK } from './link-classes'

/** One rendered link of the global footer's second line (href already base-resolved by the caller). */
export interface FooterLink {
  href: string
  label: string
}

/** The "Final, não ao vivo" chip of the global footer's second line (plain text, no script). */
const CHIP_CLASS =
  'inline-block whitespace-nowrap rounded-md border border-border bg-secondary px-2 py-0.5 align-middle font-bold text-foreground'

/** The wrapper class of the Base.astro global footer (pb-3: the phone footer stays at two lines, c13a04b). */
export const GLOBAL_FOOTER_CLASS = 'mx-auto w-full max-w-[430px] px-5 pb-3 text-center text-step-1'

const SEPARATOR = html`<span aria-hidden="true"> · </span>`
const CHIP = html`<span class="${CHIP_CLASS}" data-finality-chip>Final, não ao vivo</span>`

/** The donation link ("Apoie o projeto", #36) as DonationLink's link variant has always drawn it. */
export function donationLinkMarkup(url: string, linkClass: string): string {
  const cls = linkClass ? html` class="${linkClass}"` : ''
  return `${SEPARATOR}<a${cls} href="${url}" target="_blank" rel="noopener noreferrer" data-donation-link>Apoie o projeto ↗<span class="sr-only"> (abre em nova aba)</span></a>`
}

export interface GlobalFooterProps {
  /** Edition line: the edition's page address and its label text ("26/10/2026" → "Edição 26/10/2026"). */
  editionHref: string
  editionLabel: string
  /** The privacy/consent link ("sobre-os-dados/#privacidade", base-resolved). */
  privacyHref: string
  /** The donation address from PUBLIC_DONATION_URL; with none, no donation link exists to draw. */
  donationUrl?: string
  /** Draw the donation link (when an address is configured). Default true — today's Base markup. */
  donation?: boolean
  /** Draw the second line: the finality chip leading it, then `links`. Default true (Base); false drops the line. */
  chip?: boolean
  /** The second-line links after the chip. Default: Relatórios + Mapa por estado (the component resolves them). */
  links?: readonly FooterLink[]
  /** The wrapper div class. Default GLOBAL_FOOTER_CLASS (Base); the QuietDoc line passes its own ("pb-6 pt-2"). */
  class?: string
  /** The class of every first-line link. Default FOOTER_LINK (the 44 px tap target, #19); '' omits the attribute. */
  linkClass?: string
}

/**
 * The global footer lines, byte-identical to the Base.astro block by default:
 * `Edição <label> · Privacidade [· Apoie o projeto ↗]` then, when `chip` or links are given, a second line led
 * by the finality chip with the links joined by " · ".
 */
export function globalFooterLines(props: GlobalFooterProps): string {
  const linkClass = props.linkClass ?? FOOTER_LINK
  const cls = linkClass ? html` class="${linkClass}"` : ''
  const donation = (props.donation ?? true) && props.donationUrl ? donationLinkMarkup(props.donationUrl, linkClass) : ''
  const second = [
    props.chip ?? true ? CHIP : '',
    ...(props.links ?? []).map((l) => html`<a${cls} href="${l.href}">${l.label}</a>`),
  ]
    .filter(Boolean)
    .map(String)
    .join(`${SEPARATOR}`)
  return `${html`<div class="${props.class ?? GLOBAL_FOOTER_CLASS}" data-component="consent-footer"><a${cls} href="${props.editionHref}" data-edition-link>Edição ${props.editionLabel}</a>${SEPARATOR}<a${cls} href="${props.privacyHref}">Privacidade</a>`}${raw(donation)}${second ? raw(`<div>${second}</div>`) : ''}</div>`
}

export interface SourceFooterProps {
  /** The source note text (the page decides the words; the site never invents them). */
  source: string
  /** The "Sobre os dados ›" link address, base-resolved by the caller. */
  aboutHref: string
  /** Draw the about link after the source note. Default true (the pilot carries it). */
  aboutLink?: boolean
  /**
   * The about link's class. Default 'source-footer__about' (the keyboard-only link of the card variant).
   * Pass '' to omit the class attribute entirely: several standard pages (the share sheets, /tres-ciclos/<uf>/,
   * the story and recap pages, the state page) carry the plain `<a href>` with no class — #114's census.
   */
  aboutClass?: string
  /** The text between note and link. Default '' (the card variant); the standard pages pass ' · '. */
  separator?: string
  /** The <footer> class. Default 'source-footer' (the pilot's); the utility-class pages pass their own string. */
  class?: string
  /** aria-hidden="true" on the <footer>: the inert backdrop copy behind a share sheet (#91/#50). Default false. */
  ariaHidden?: boolean
  /**
   * The host template's scoped-style marker ('data-astro-cid-…', path-derived and content-stable): a page whose
   * scoped <style> stamps its literal elements passes its marker so the MOVED footer keeps the exact bytes the
   * scoping put on it and on its about link (#114's BrasilScreen case). Default '' (no marker). Renaming the
   * host file changes Astro's marker — the html-diff gate (#113) then catches the drift loudly, not silently.
   */
  scopeMarker?: string
}

/**
 * The per-page source footer, byte-identical to the pilot's (the city card) by default:
 * `<footer class="source-footer" data-component="source-footer">{note}<a class="source-footer__about">…`
 */
export function sourceFooter(props: SourceFooterProps): string {
  const aboutClass = props.aboutClass ?? 'source-footer__about'
  const marker = props.scopeMarker ? raw(` ${props.scopeMarker}`) : ''
  const about =
    props.aboutLink ?? true
      ? html`${props.separator ?? ''}<a${aboutClass ? html` class="${aboutClass}"` : ''} href="${props.aboutHref}"${marker}>Sobre os dados ›</a>`
      : ''
  const aria = props.ariaHidden ? ' aria-hidden="true"' : ''
  return `${html`<footer class="${props.class ?? 'source-footer'}" data-component="source-footer"`}${raw(`${aria}${marker}`)}>${html`${props.source}`}${about}</footer>`
}
