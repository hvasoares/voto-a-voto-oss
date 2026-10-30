/** The date format of the editions and of the "Sobre os dados" page, apart from `about.ts` so a script that only needs the date does not carry the page's formatting (private#214). */

/** ISO date-time -> "26/10/2026 21:55" (UTC as recorded in the manifest; day first, as the pages write). */
export function formatUtc(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso)
  if (!m) return iso
  const date = `${m[3]}/${m[2]}/${m[1]}`
  return m[4] && m[5] ? `${date} ${m[4]}:${m[5]}` : date
}
