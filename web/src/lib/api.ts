/**
 * The static JSON API (ticket #64): the shards the pages read, published as they are, plus `edition.json` per edition and
 * `api/latest.json`, a stable pointer to the shards of the edition the site shows (their directory name changes with the
 * data). Pure: paths and documents only. The public subset is documented on `/api/`; `peers.json` is a build input
 * with no screen yet and is not part of it.
 */
import type { Edition } from './editions'
import { editionPath, FEED_PATH, releasePath } from './editions'

export const API_PATH = 'api/'
export const LATEST_PATH = 'api/latest.json'

/** The endpoints of the shards of one dataset version, as site-relative templates. */
export function shardEndpoints(version: string): Record<'search' | 'totals' | 'state' | 'city', string> {
  const root = `data/v${version}/`
  return {
    search: `${root}search.json`,
    totals: `${root}totals.json`,
    state: `${root}state/{uf}.json`,
    city: `${root}city/{uf}/{slug}.json`,
  }
}

/** The page-data file of a city page is the city shard itself (same bytes the page was drawn from). */
export const cityDataPath = (version: string, uf: string, slug: string): string => `data/v${version}/city/${uf}/${slug}.json`
export const stateDataPath = (version: string, uf: string): string => `data/v${version}/state/${uf}.json`

/** `api/latest.json`: absolute addresses, so a program needs only this one address. */
export function latestDocument(edition: Edition, site: { origin: string; base: string }): Record<string, unknown> {
  const root = `${site.origin}${site.base}`
  const endpoints = Object.fromEntries(Object.entries(shardEndpoints(edition.fingerprint)).map(([name, path]) => [name, root + path]))
  return {
    edition: edition.id,
    date: edition.date,
    fingerprint: edition.fingerprint,
    endpoints,
    edition_json: `${root}${editionPath(edition.id)}edition.json`,
    release: `${root}${releasePath(edition.id)}`,
    feed: `${root}${FEED_PATH}`,
  }
}
