/**
 * The way back from the calculation page (#152): the back link is a plain link to the page that prints the figure; when the visitor came from a page of the site,
 * it steps back in history instead, so the card is where it was left. Since private#214 the page is a stub, and its script binds this (`bindWayBack`) to the stub's
 * own link back instead of an inline script. PURE of the catalog and the build, so the page script stays light.
 */

/**
 * Where did the visitor come from (#152): true when the referrer is another page of this site (not a calculation page, not an outside or empty
 * referrer, which is what a shared link has).
 */
export function cameFromSite(referrer: string, origin: string): boolean {
  try {
    const from = new URL(referrer)
    return from.origin === origin && !/\/fato\//.test(from.pathname)
  } catch {
    return false
  }
}

/** The click on the stub's link back: a plain click, with history behind it, from a page of the site, goes back; any other click follows the link. */
export function bindWayBack(doc: Document = document, win: Window = window): void {
  doc.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[data-stub-back]')
    if (a && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button) && win.history.length > 1 && cameFromSite(doc.referrer, win.location.origin)) {
      e.preventDefault()
      win.history.back()
    }
  })
}
