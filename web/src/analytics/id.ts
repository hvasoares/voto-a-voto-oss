/**
 * The GA4 measurement ID of ticket #20, from build configuration — and only from build configuration.
 * With no ID set, analytics stays a no-op (src/analytics/ga4.ts is never installed).
 *
 * Astro exposes only PUBLIC_-prefixed variables to the browser bundle, so the deploy sets
 * PUBLIC_GA_MEASUREMENT_ID; the unprefixed GA_MEASUREMENT_ID is accepted as an alias when a build
 * pipes it through (it is read through the whole `import.meta.env` object, which the browser build
 * resolves to the public values). No real id is ever committed: a fake `G-TEST…` id in tests only.
 */
type EnvVars = Record<string, string | undefined>

export function measurementId(): string {
  const env = (import.meta.env ?? {}) as EnvVars
  return (env.PUBLIC_GA_MEASUREMENT_ID ?? env.GA_MEASUREMENT_ID ?? '').trim()
}