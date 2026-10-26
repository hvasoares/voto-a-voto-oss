import { describe, expect, it } from 'vitest'
import { expectHydrated } from '../../shared/slot-test'
import { testContext } from '../../shared/test-context'
import { meta, slot } from './slot'

const ctx = testContext({ uf: 'rj', slug: 'cidade-exemplo', regiao: 'sudeste', report: 'maiores-viradas' })

describe('slot brasil (ticket #10)', () => {
  /*
   * EXPECTED FAILURE while the slot is blank: the suite stays green but this slot is listed as
   * "not yet hydrated". HYDRATING AGENT: after you set `hydrated: true` in slot.ts, change
   * `it.fails` to `it`. (If you forget, vitest fails this test because it now passes.)
   */
  it.fails('is hydrated (not yet hydrated)', async () => {
    await expectHydrated(slot, ctx)
  })

  it('declares its contract', () => {
    expect(meta.ticket).toBe(10)
    expect(meta.route).toBe('/brasil/')
  })
})
