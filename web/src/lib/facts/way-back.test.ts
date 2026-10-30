import { expect, it } from 'vitest'
import { cameFromSite } from './way-back'

const ORIGIN = 'https://site.test'

it.each([
  ['a card of the site', `${ORIGIN}/rj/niteroi/`, true],
  ['a shared link has no referrer', '', false],
  ['another site', 'https://other.test/rj/', false],
  ['another calculation page', `${ORIGIN}/fato/brasil/x/`, false],
])('%s: %s', (_name, referrer, expected) => {
  expect(cameFromSite(referrer, ORIGIN)).toBe(expected)
})
