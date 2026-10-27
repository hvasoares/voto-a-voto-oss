import type { APIRoute } from 'astro'
import { loadBrasil } from '@/lib/brasil-load'

/** The numbers /brasil/ is drawn from: the same `BrasilView` the page renders, serialized as it is (ticket #64). */
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await loadBrasil()), { headers: { 'content-type': 'application/json; charset=utf-8' } })
