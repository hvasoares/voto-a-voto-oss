import type { APIRoute } from 'astro'
import { recapUfs } from '@/lib/recap-data'
import { stateKit } from '@/lib/press-kit-build'

/** The state's recap picture with the source seal (#66): one file per state, deterministic for an edition. */
export async function getStaticPaths() {
  return (await recapUfs()).map((uf) => ({ params: { uf } }))
}
export const GET: APIRoute = async ({ params }) => new Response((await stateKit(params.uf!)).svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } })
