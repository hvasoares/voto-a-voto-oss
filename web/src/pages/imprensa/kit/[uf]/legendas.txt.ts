import type { APIRoute } from 'astro'
import { recapUfs } from '@/lib/recap-data'
import { stateKit } from '@/lib/press-kit-build'

/** The state's caption, text alternative, credit, licence and citation (#66): one file per state. */
export async function getStaticPaths() {
  return (await recapUfs()).map((uf) => ({ params: { uf } }))
}
export const GET: APIRoute = async ({ params }) => new Response((await stateKit(params.uf!)).captions, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
