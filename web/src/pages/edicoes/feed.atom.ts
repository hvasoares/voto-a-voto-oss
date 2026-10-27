import type { APIRoute } from 'astro'
import { atomFeed } from '@/lib/editions'
import { loadEditions } from '@/lib/editions-load'
import { siteOrigin } from '@/lib/share-url'
import { normalizeBase } from '@/paths'

/** The Atom feed of the editions (ticket #59): text and links only, no analytics. */
export const GET: APIRoute = () =>
  new Response(atomFeed(loadEditions(), { origin: siteOrigin(), base: normalizeBase(import.meta.env.BASE_URL) }), {
    headers: { 'content-type': 'application/atom+xml; charset=utf-8' },
  })
