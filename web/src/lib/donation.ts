/**
 * The donation page address (ticket #36), from build configuration only: `PUBLIC_DONATION_URL` (Astro inlines only
 * PUBLIC_-prefixed variables into the page, like the metrics id of `analytics/id.ts`). With nothing configured, or
 * something that is not a plain https address, there is no address: the link is not drawn anywhere, the build passes
 * and no address is invented. Credentials in an address and any scheme but https are refused.
 */
type EnvVars = Record<string, string | undefined | null>

export function donationUrl(env: EnvVars = (import.meta.env ?? {}) as EnvVars): string | undefined {
  const raw = (env.PUBLIC_DONATION_URL ?? '').trim()
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password) return undefined
    return url.href
  } catch {
    return undefined
  }
}
