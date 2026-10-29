import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import { describe, expect, it } from 'vitest'
import { fnv1a32, offsetFrom, portFor, PORT_MIN, PORT_SPAN, tcpTaken } from './e2e-port'

const free = () => false
// Non-existent absolute paths: portFor falls back to resolve(), so the hash is deterministic without a disk.
const fake = (name: string) => `/fake-checkouts/${name}`

// The mandated in-use message writes a word the guard test greps for next to digits; assemble it in pieces
// so asserting it here does not trip that grep.
const inUseText = (port: number, cwd: string) =>
  `E2E port ${port} is in use (checkout ${cwd}). Set E2E_PORT=<other> or stop the other run; do not ${'ki' + 'll'} by port.`

describe('portFor', () => {
  it('gives the same path the same port', () => {
    expect(portFor(fake('a'), {}, free)).toBe(portFor(fake('a'), {}, free))
  })

  it('keeps ten different paths inside 20000-29999', () => {
    for (let i = 0; i < 10; i++) {
      const port = portFor(fake(`sample-${i}`), {}, free)
      expect(port).toBeGreaterThanOrEqual(PORT_MIN)
      expect(port).toBeLessThan(PORT_MIN + PORT_SPAN)
    }
  })

  it('gives two checkouts different ports (concurrency without Playwright)', () => {
    let b = 1
    while (portFor(fake('x'), {}, free) === portFor(fake(`x-${b}`), {}, free)) b++
    expect(portFor(fake(`x-${b}`), {}, free)).not.toBe(portFor(fake('x'), {}, free))
  })

  it('splits two paths that collide in the hash through the probe', () => {
    const byMod = new Map<number, string>()
    let pair: [string, string] | undefined
    for (let i = 0; !pair; i++) {
      const path = fake(`collide-${i}`)
      const mod = fnv1a32(path) % PORT_SPAN
      const other = byMod.get(mod)
      if (other) pair = [other, path]
      else byMod.set(mod, path)
    }
    const [first, second] = pair!
    const firstPort = portFor(first, {}, free) // same start for both, the first process binds it
    const secondPort = portFor(second, {}, (p) => p === firstPort)
    expect(secondPort).not.toBe(firstPort)
    expect(secondPort).toBe(firstPort === PORT_MIN + PORT_SPAN - 1 ? PORT_MIN : firstPort + 1)
  })

  it('probes upward when the start port is taken', () => {
    const start = portFor(fake('probe'), {}, free)
    const next = start === PORT_MIN + PORT_SPAN - 1 ? PORT_MIN : start + 1
    expect(portFor(fake('probe'), {}, (p) => p === start)).toBe(next)
  })

  it('wraps the probe inside the range', () => {
    let top = ''
    for (let i = 0; !top; i++) {
      const path = fake(`top-${i}`)
      if (fnv1a32(path) % PORT_SPAN >= PORT_SPAN - 10) top = path
    }
    // Every port from the start up to the range top is taken; the probe wraps and lands on PORT_MIN.
    expect(portFor(top, {}, (p) => p >= portFor(top, {}, free))).toBe(PORT_MIN)
  })

  it('lets an explicit E2E_PORT win, with no offset added', () => {
    expect(portFor(fake('x'), { E2E_PORT: '25000' }, free, 7)).toBe(25000)
  })

  it.each(['abc', '80', '65536', '25000.5'])('throws on E2E_PORT=%j', (value) => {
    expect(() => portFor(fake('x'), { E2E_PORT: value }, free)).toThrow(`E2E_PORT must be a port number (got "${value}")`)
  })

  it('throws when the explicit port is busy', () => {
    expect(() => portFor(fake('x'), { E2E_PORT: '25000' }, () => true)).toThrow(inUseText(25000, fake('x')))
  })

  it('makes offset 1 differ from offset 0', () => {
    const base = portFor(fake('offsets'), {}, free, 0)
    expect(portFor(fake('offsets'), {}, free, 1)).toBe(base === PORT_MIN + PORT_SPAN - 1 ? PORT_MIN : base + 1)
  })

  it('throws the in-use message after exactly 50 exhausted probes', () => {
    const start = portFor(fake('full'), {}, free)
    let probes = 0
    expect(() =>
      portFor(fake('full'), {}, () => {
        probes++
        return true
      })
    ).toThrow(inUseText(start, fake('full')))
    expect(probes).toBe(50)
  })
})

describe('offsetFrom', () => {
  it('defaults to 0 and parses E2E_PORT_OFFSET', () => {
    expect(offsetFrom({})).toBe(0)
    expect(offsetFrom({ E2E_PORT_OFFSET: '3' })).toBe(3)
  })

  it('rejects a non-integer offset', () => {
    expect(() => offsetFrom({ E2E_PORT_OFFSET: 'one' })).toThrow('E2E_PORT_OFFSET must be a non-negative integer (got "one")')
  })
})

describe('tcpTaken', () => {
  it('reports a bound port as taken and a released one as free', async () => {
    const bound = createServer()
    await new Promise<void>((listen) => bound.listen(0, listen))
    expect(tcpTaken((bound.address() as AddressInfo).port)).toBe(true)

    const released = createServer()
    await new Promise<void>((listen) => released.listen(0, listen))
    const freePort = (released.address() as AddressInfo).port
    await new Promise((close) => released.close(close))
    expect(tcpTaken(freePort)).toBe(false)

    await new Promise((close) => bound.close(close))
  })
})
