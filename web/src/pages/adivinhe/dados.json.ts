import type { APIRoute } from 'astro'
import { buildGameData } from '@/lib/game-data'

/** The daily game's data file (#69): one row per city, the order of the days. The game page is the only one that fetches it. */
export const GET: APIRoute = async () => new Response(JSON.stringify(await buildGameData()), { headers: { 'content-type': 'application/json; charset=utf-8' } })
