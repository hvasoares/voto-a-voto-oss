import type { APIRoute } from 'astro'
import { latestDocument } from '@/lib/api'
import { currentEdition } from '@/lib/editions-load'
import { siteOrigin } from '@/lib/share-url'
import { siteBase } from '@/paths'

/** The stable pointer of the static API (ticket #64): the edition the site shows and the addresses of its shards. */
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(latestDocument(await currentEdition(), { origin: siteOrigin(), base: siteBase() })), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
