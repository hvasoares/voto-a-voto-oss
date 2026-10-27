// @vitest-environment jsdom
/** The page-level script keeps the first tap (it may land before hydration): UF on the island root. */
import { describe, expect, it } from 'vitest'

function pointerdown(target: Element, bubbles = true) {
  const ev = new PointerEvent('pointerdown', { bubbles, cancelable: true })
  Object.defineProperty(ev, 'target', { value: target })
  document.dispatchEvent(ev)
}

function click(target: Element, bubbles = true) {
  const ev = new MouseEvent('click', { bubbles, cancelable: true })
  Object.defineProperty(ev, 'target', { value: target })
  document.dispatchEvent(ev)
}

async function loaded() {
  document.body.innerHTML = `
    <astro-island data-slot="state-map">
      <a data-uf="bb" href="/s/bb/">BB</a>
    </astro-island>
    <a data-uf="rj" href="/s/rj/">RJ</a>
  `
  const island = document.querySelector('astro-island') as HTMLElement
  const tile = island.querySelector('a[data-uf]') as HTMLElement
  await import('./map-pending')
  return { island, tile }
}

describe('map-pending page script', () => {
  it('records the tapped UF on the island and ignores taps outside', async () => {
    const { island, tile } = await loaded()
    void island
    const outside = document.querySelectorAll('a[data-uf]')[1] as HTMLElement
    pointerdown(tile)
    pointerdown(outside)
    expect((document.querySelector('astro-island') as HTMLElement).getAttribute('data-pending-uf')).toBe('bb')
  })

  it('a first click stays a selection: anchor navigation is prevented and the UF is recorded', async () => {
    const { tile } = await loaded()
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'target', { value: tile })
    const wentThrough = document.dispatchEvent(ev)
    expect(wentThrough).toBe(false) // cancelable + preventDefault in the capture handler
    expect((document.querySelector('astro-island') as HTMLElement).getAttribute('data-pending-uf')).toBe('bb')
  })

  it('without a tap nothing is recorded (the script is inert until interaction)', async () => {
    await loaded()
    expect(document.querySelector('astro-island')?.hasAttribute('data-pending-uf')).toBe(false)
  })

  it('keeps the tapped municipality (data-cd) too, on a separate attribute', async () => {
    document.body.innerHTML = `
      <astro-island data-slot="city-map">
        <a data-cd="58001" href="/s/rj/cidade/">Cidade</a>
      </astro-island>
    `
    await import('./map-pending')
    const tile = document.querySelector('a[data-cd]') as HTMLElement
    pointerdown(tile)
    click(tile)
    const island = document.querySelector('astro-island') as HTMLElement
    expect(island.getAttribute('data-pending-cd')).toBe('58001')
    expect(island.hasAttribute('data-pending-uf')).toBe(false)
  })
})