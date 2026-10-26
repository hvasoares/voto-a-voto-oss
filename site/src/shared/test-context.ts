import { resolve } from 'node:path'
import { noopAnalytics } from '../analytics'
import { createNodeStore } from '../data/node'
import type { Params } from '../routes'
import { makeHref, type SlotContext } from './slot'

/** Test helper: a SlotContext over the committed fixtures (Node only). */
export function testContext(params: Params = {}, query = ''): SlotContext {
  return {
    base: '/',
    params,
    query: new URLSearchParams(query),
    data: createNodeStore(resolve(__dirname, '../../fixtures/data')),
    analytics: noopAnalytics,
    useFrameFixture: false,
    href: makeHref('/', params),
  }
}
