// @vitest-environment jsdom
/**
 * The page-level script keeps what is tapped before hydration: a state or a shape on the island root
 * (UF/CD storage), a view-toggle direction, and the overlay builder's options in order.
 */
import { describe, expect, it } from 'vitest'
import { HELD_STORAGE } from '@/lib/island-ready'
import { installPendingCapture } from './island-pending'

function pointerdown(target: Element, bubbles = true) {
  const ev = new PointerEvent('pointerdown', { bubbles, cancelable: true })
  Object.defineProperty(ev, 'target', { value: target })
  document.dispatchEvent(ev)
}

function click(target: Element, bubbles = true) {
  const ev = new MouseEvent('click', { bubbles, cancelable: true })
  Object.defineProperty(ev, 'target', { value: target })
  return document.dispatchEvent(ev)
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
  await import('./island-pending')
  return { island, tile }
}

describe('island-pending page script', () => {
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
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'target', { value: tile })
    const wentThrough = document.dispatchEvent(event)
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
    await import('./island-pending')
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
    await import('./island-pending')
    const row = document.querySelector('a[data-cd]') as HTMLElement
    pointerdown(row)
    const wentThrough = click(row)
    expect(wentThrough).toBe(true)
    const island = document.querySelector('astro-island') as HTMLElement
    expect(island.hasAttribute('data-pending-cd')).toBe(false)
    expect(island.hasAttribute('data-pending-uf')).toBe(false)
  })

  it('keeps the direction of a view-toggle tap while the ssr attribute is up, last direction winning', async () => {
    document.body.innerHTML = `
      <astro-island data-slot="state-map" ssr>
        <a href="?vista=mapa">Mapa</a>
        <a href="?">Lista</a>
      </astro-island>
    `
    await import('./island-pending')
    const [mapa, lista] = [...document.querySelectorAll('a')] as HTMLElement[]
    expect(click(mapa!)).toBe(false) // swallowed: the island applies the toggle after hydration
    expect(document.querySelector('astro-island')!.getAttribute('data-pending-vista')).toBe('mapa')
    void click(lista!)
    expect(document.querySelector('astro-island')!.getAttribute('data-pending-vista')).toBe('lista')
  })

  it('keeps the overlay builder options in tap order, once it is hydrated no more', async () => {
    document.body.innerHTML = `
      <astro-island data-builder islan ssr>
        <button data-option="Medida:margem">Margem</button>
        <button data-option="Ciclo:a-b">A - B</button>
        <button data-option="Tamanho:estado">Estado</button>
      </astro-island>
    `
    await import('./island-pending')
    const buttons = [...document.querySelectorAll('button')] as HTMLElement[]
    for (const b of buttons) click(b)
    const island = document.querySelector('astro-island') as HTMLElement
    expect(island.getAttribute('data-pending-options')).toBe('Medida:margem|Ciclo:a-b|Tamanho:estado')
    island.removeAttribute('ssr')
    island.removeAttribute('data-pending-options')
    click(buttons[0]!)
    expect(island.hasAttribute('data-pending-options')).toBe(false)
  })
})

describe('the installer the overlay page inlines (is:inline)', () => {
  it('its source stands alone: no imports, no free variables — a runnable script when stringified', () => {
    const fn = new Function(`return (${installPendingCapture.toString()})`)() as () => void
    expect(typeof fn).toBe('function')
  })

  it('the storage attribute names are exactly the shared HELD_STORAGE vocabulary', () => {
    for (const [, attr] of HELD_STORAGE) {
      expect(installPendingCapture.toString()).toContain(attr)
    }
  })
})
