import { describe, expect, it } from 'vitest'
import { expectHydrated } from '../../shared/slot-test'
import { testContext } from '../../shared/test-context'
import { fixtureRoute } from './fixture'
import { meta, slot } from './slot'

const ctxOf = (slug: string, uf = 'rj') => testContext({ uf, slug })
const render = async (slug = 'cidade-exemplo', uf = 'rj') => (await slot.render(ctxOf(slug, uf))).html.value
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/\s+/g, ' ')
/** The markup of one round panel of the page. */
const panel = (html: string, turno: 1 | 2) => html.split(/(?=<section class="cycles__round")/).find((p) => p.startsWith(`<section class="cycles__round" data-turno="${turno}"`)) ?? ''
const blocks = (p: string) => p.split(/(?=<div class="cycle[ \"])/).slice(1)

describe('slot city-cycles (ticket #6)', () => {
  it('is hydrated (not yet hydrated)', async () => {
    await expectHydrated(slot, ctxOf('cidade-exemplo'))
  })

  it('declares its contract', () => {
    expect(meta.ticket).toBe(6)
    expect(meta.route).toBe('/:uf/:slug/tres-ciclos/')
  })

  it('the fixture state is round 1, as the Sketch frame draws it', () => {
    expect(fixtureRoute).toBe('/rj/cidade-exemplo/tres-ciclos/?turno=1')
    expect(meta.fixtureRoute).toBe(fixtureRoute)
  })
})

describe('city-cycles page (fixture city that reproduces the frame)', () => {
  it('has the frame texts: title, subtitle per round, links, source line, legend', async () => {
    const h = await render()
    const t = text(h)
    expect(t).toContain('Três ciclos')
    expect(t).toContain('Presidente 2018, 2022 e 2026 · Cidade Exemplo (1º turno)')
    expect(t).toContain('Presidente 2018, 2022 e 2026 · Cidade Exemplo (2º turno)')
    expect(t).toContain('‹ Início')
    expect(t).toContain('Cartão da cidade')
    expect(t).toContain('Fonte: TSE, dados finais')
    expect(t).toContain('Br = brancos · Nu = nulos.')
    expect(h).toContain('href="/rj/cidade-exemplo/"')
  })

  it('does not carry the old "not collected" note or the not-hydrated marker', async () => {
    const h = await render()
    expect(h).not.toContain('ainda não foram coletados')
    expect(h).not.toContain('data-not-hydrated')
  })

  it('round 1: the three cycles with the frame numbers (79/80/70% voted, A and B shares, abstention shares)', async () => {
    const t = blocks(panel(await render(), 1)).map(text)
    expect(t).toHaveLength(3)
    expect(t[0]).toContain('2018')
    expect(t[0]).toContain('Votaram 79% do eleitorado (barra: % dos votos)')
    expect(t[0]).toContain('A 55%')
    expect(t[0]).toContain('B 45%')
    expect(t[0]).toContain('Não votaram 21% do eleitorado (barra: % dos que não votaram)')
    expect(t[0]).toContain('Abstenção 82%')
    expect(t[1]).toContain('Votaram 80% do eleitorado')
    expect(t[1]).toContain('A 49%')
    expect(t[1]).toContain('B 51%')
    expect(t[2]).toContain('Votaram 70% do eleitorado')
    expect(t[2]).toContain('Abstenção 78%')
  })

  it('the same side is the same candidate in every cycle: the segment order is a, b in all three', async () => {
    for (const b of blocks(panel(await render(), 1))) {
      const kinds = [...b.matchAll(/bar__seg--(a|b|outros)"/g)].map((m) => m[1])
      expect(kinds).toEqual(['a', 'b'])
    }
  })

  it('states the ordering rule once, in one sentence', async () => {
    const t = text(await render())
    expect(t).toContain('O candidato de menor número na urna fica à esquerda')
    expect(t.split('menor número').length - 1).toBe(1)
  })

  it('both rounds are in the HTML (no JavaScript needed); round 2 is the default shown, round 1 is hidden until asked', async () => {
    const h = await render()
    expect(panel(h, 2)).not.toMatch(/^<section[^>]*\bhidden\b/)
    expect(panel(h, 1).split('>')[0]).toContain('hidden')
    expect(blocks(panel(h, 2))).toHaveLength(3)
  })

  it('the round switch is a plain link with the query parameter', async () => {
    const h = await render()
    expect(h).toContain('href="/rj/cidade-exemplo/tres-ciclos/?turno=1"')
  })

  it('shows no fictitious banner on real data, and the fictitious banner on fixture data', async () => {
    expect(await render()).toContain('EXEMPLO')
    const ctx = ctxOf('cidade-exemplo')
    const real = { ...ctx, data: new Proxy(ctx.data, { get: (t, k, r) => (k === 'manifest' ? async () => ({ fixture: false }) : Reflect.get(t, k, r)) }) }
    const h = (await slot.render(real as typeof ctx)).html.value
    expect(h).not.toContain('EXEMPLO')
    expect(h).not.toContain('FICTÍCIOS')
  })
})

describe('city-cycles page: a city that only exists from 2026', () => {
  it('2018 and 2022 show the no-data block with one sentence, 2026 shows data, in both rounds', async () => {
    const h = await render('boa-esperanca-do-norte', 'mt')
    for (const turno of [1, 2] as const) {
      const [b18, b22, b26] = blocks(panel(h, turno)).map(text)
      for (const b of [b18, b22]) {
        expect(b).toContain('sem dados nesse ciclo')
        expect(b).toContain('Este município só tem dados a partir de 2026.')
        expect(b).not.toContain('Votaram')
        expect(b).not.toMatch(/\b0%/)
      }
      expect(b26).toContain('Votaram')
      expect(b26).not.toContain('sem dados')
    }
  })

  it('a no-data block is the same size class as a data block (same element, own modifier)', async () => {
    const [b18] = blocks(panel(await render('boa-esperanca-do-norte', 'mt'), 2))
    expect(b18).toMatch(/^<div class="cycle cycle--nodata"/)
  })
})

describe('city-cycles page: overseas post', () => {
  it('renders three cycles without throwing', async () => {
    const h = await render('exterior-exemplo', 'zz')
    expect(blocks(panel(h, 2))).toHaveLength(3)
  })
})
