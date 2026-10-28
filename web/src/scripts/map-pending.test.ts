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

  it('keeps a tapped map shape (data-cd inside an svg) on its own attribute', async () => {
    document.body.innerHTML = `
      <astro-island data-slot="city-map">
        <svg><a data-cd="58001" href="/s/rj/cidade/"><path d="M0 0"/></a></svg>
      </astro-island>
    `
    await import('./map-pending')
    const shape = document.querySelector('a[data-cd]') as unknown as HTMLElement
    pointerdown(shape)
    click(shape)
    const island = document.querySelector('astro-island') as HTMLElement
    expect(island.getAttribute('data-pending-cd')).toBe('58001')
    expect(island.hasAttribute('data-pending-uf')).toBe(false)
  })

  it('leaves a tap on a list row alone: the link navigates, hydrated or not (#83)', async () => {
    document.body.innerHTML = `
      <astro-island data-slot="city-map" ssr>
        <section data-uf="rj"><nav><a data-cd="58001" href="/s/rj/cidade/">Cidade</a></nav></section>
      </astro-island>
    `
    await import('./map-pending')
    const row = document.querySelector('a[data-cd]') as HTMLElement
    pointerdown(row)
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'target', { value: row })
    expect(document.dispatchEvent(ev)).toBe(true)
    const island = document.querySelector('astro-island') as HTMLElement
    expect(island.hasAttribute('data-pending-cd')).toBe(false)
    expect(island.hasAttribute('data-pending-uf')).toBe(false)
  })
})
