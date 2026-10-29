// @vitest-environment jsdom
/**
 * data-ready of the story sequence (#122): no on the server and until the row's layout has settled on the
 * card the address names (never before the first commit of the row), then yes once.
 */
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StorySequence, { type StoryCardView } from './StorySequence'

vi.mock('@/lib/share-raster', () => ({
  svgToPng: vi.fn(async (_s: string, name: string) => new File(['png'], name, { type: 'image/png' })),
  saveBlob: vi.fn(),
}))

const CARDS: StoryCardView[] = [1, 2, 3].map((n) => ({
  n,
  svg: `<svg viewBox="0 0 100 100"><title>cartão ${n}</title></svg>`,
  text: `Texto do cartão ${n}`,
  link: `https://o.exemplo.br/pagina/#${n}`,
  filename: `cartao-${n}.png`,
  caption: `Legenda ${n}`,
  address: `o.exemplo.br/pagina#${n}`,
}))
const words = { region: 'História', dots: 'Cartão {n} de {total}', dot: 'Cartão', share: 'Compartilhar', linkNote: 'Nota', nojs: 'Sem JS' }

// jsdom implements neither: the row centres its card with them.
HTMLElement.prototype.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}

afterEach(() => {
  history.replaceState(null, '', '/historia/')
})

describe('the story sequence island', () => {
  it('data-ready: no on the server, yes once the row has settled on its first card', async () => {
    const ssr = renderToStaticMarkup(<StorySequence cards={CARDS} words={words} />)
    expect(ssr).toContain('data-ready="no"')
    render(<StorySequence cards={CARDS} words={words} />)
    const story = document.querySelector('[data-story]')!
    expect(story.getAttribute('data-ready')).toBe('no')
    await vi.waitFor(() => expect(story.getAttribute('data-ready')).toBe('yes'))
    // ready once, never reverts: a redraw keeps it.
    expect(story.getAttribute('data-current')).toBe('1')
  })
})
