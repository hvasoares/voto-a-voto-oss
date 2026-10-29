import { describe, expect, it } from 'vitest'
import { DESTINATIONS, cityTarget, destinationLink, landingDestination, readDestination } from './destinations'
import { HOME_HINT_PLAIN, HOME_HINT_STANDARD } from './sentences/catalog-home'

describe('destinations: a closed list read from the query parameter', () => {
  it('reads a listed destination', () => {
    expect(readDestination('?para=compartilhar')).toBe('compartilhar')
    expect(readDestination('?para=tres-ciclos')).toBe('tres-ciclos')
    expect(readDestination('?para=cara-a-cara')).toBe('cara-a-cara')
  })

  it.each(['', '?', '?para=', '?para=cartao', '?para=https://example.org/', '?para=//example.org', '?para=constructor', '?para=__proto__', '?para=toString', '?outro=compartilhar', '?para=tres_ciclos', '?para=Tres-Ciclos', '?para=tres-ciclos/', '?para=cara-a-cara/?nivel=estado', '?para=cara_a_cara', '?para=carta'])(
    'ignores %j',
    (search) => {
      expect(readDestination(search)).toBeUndefined()
    },
  )

  it('only offers addresses of this site that hold the chosen city, never a free address', () => {
    for (const { to } of Object.values(DESTINATIONS)) expect(to).toMatch(/^(\{c\}\/([a-z-]+\/)?|cara-a-cara\/\?nivel=cidade&a=\{c\})$/)
  })

  it.each([HOME_HINT_STANDARD, HOME_HINT_PLAIN])('every destination has its hint line above the search, and no hint is left over', (hints) => {
    expect(Object.keys(hints).map((k) => k.replace('home.hint.', '')).sort()).toEqual(Object.keys(DESTINATIONS).sort())
  })

  it('builds the target of a pick: the card, a page of the city, or a route that takes the city', () => {
    expect(cityTarget('mt', 'boa-esperanca-do-norte')).toBe('/mt/boa-esperanca-do-norte/')
    expect(cityTarget('mt', 'x', 'compartilhar')).toBe('/mt/x/compartilhar/')
    expect(cityTarget('mt', 'x', 'tres-ciclos')).toBe('/mt/x/tres-ciclos/')
    expect(cityTarget('mt', 'x', 'cara-a-cara')).toBe('/cara-a-cara/?nivel=cidade&a=mt/x')
  })

  it('the Home link round-trips through the reader', () => {
    expect(readDestination(destinationLink('compartilhar').split('#')[0]!)).toBe('compartilhar')
  })
})

describe('landingDestination: when the search is focused and hinted', () => {
  it('names the destination for a visitor with no remembered city', () => {
    expect(landingDestination('?para=cidade', false)).toBe('cidade')
  })
  it('names nothing with a remembered city, with no parameter or with an unknown one', () => {
    expect(landingDestination('?para=cidade', true)).toBeUndefined()
    expect(landingDestination('', false)).toBeUndefined()
    expect(landingDestination('?para=x', false)).toBeUndefined()
  })
})
