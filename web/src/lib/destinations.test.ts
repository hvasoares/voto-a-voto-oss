import { describe, expect, it } from 'vitest'
import { DESTINATIONS, destinationLink, readDestination } from './destinations'

describe('destinations: a closed list read from the query parameter', () => {
  it('reads a listed destination', () => {
    expect(readDestination('?para=compartilhar')).toBe('compartilhar')
  })

  it.each(['', '?', '?para=', '?para=cartao', '?para=https://example.org/', '?para=//example.org', '?para=constructor', '?para=__proto__', '?para=toString', '?outro=compartilhar'])(
    'ignores %j',
    (search) => {
      expect(readDestination(search)).toBeUndefined()
    },
  )

  it('only offers paths below the city, never an address', () => {
    for (const path of Object.values(DESTINATIONS)) expect(path).toMatch(/^[a-z-]+\/$/)
  })

  it('the Home link round-trips through the reader', () => {
    expect(readDestination(destinationLink('compartilhar').split('#')[0]!)).toBe('compartilhar')
  })
})
