import { NOT_YET_HYDRATED, type Slot, type SlotContext } from './slot'

/**
 * Used by each slot's test. Throws "not yet hydrated" while the slot is still the blank placeholder.
 * Hydrating agent: when the slot is real, `hydrated` is true and the rendered page has no marker.
 */
export async function expectHydrated(slot: Slot, ctx: SlotContext): Promise<void> {
  const page = await slot.render(ctx)
  if (!slot.hydrated || page.html.value.includes('data-not-hydrated')) {
    throw new Error(`${NOT_YET_HYDRATED}: slot "${slot.meta.id}" (ticket #${slot.meta.ticket}) still renders the blank placeholder`)
  }
}
