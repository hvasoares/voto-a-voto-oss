import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { embedPngKeys, readPngKeys, type PngPayload } from './png-keys'

const payload: PngPayload = { view: 'stat:margem:2026-2:square', places: ['rj/cidade-exemplo'], edition: '2026-10-26', lang: 'pt-BR', check: '0123456789abcdef' }
const make = async (w = 40, h = 30) => new Uint8Array(await sharp({ create: { width: w, height: h, channels: 3, background: '#faf7f0' } }).png().toBuffer())

describe('the keys inside a PNG', () => {
  it('round-trips, and the picture is still a valid PNG of the same pixels', async () => {
    const plain = await make()
    const withKeys = embedPngKeys(plain, payload)
    expect(readPngKeys(withKeys)).toEqual({ ok: true, payload })
    const meta = await sharp(Buffer.from(withKeys)).metadata()
    expect([meta.width, meta.height]).toEqual([40, 30])
    expect((await sharp(Buffer.from(withKeys)).raw().toBuffer()).equals(await sharp(Buffer.from(plain)).raw().toBuffer())).toBe(true)
  })
  it('replaces its own chunk instead of adding a second', async () => {
    const twice = embedPngKeys(embedPngKeys(await make(), payload), { ...payload, check: 'fedcba9876543210' })
    expect(readPngKeys(twice)).toMatchObject({ ok: true, payload: { check: 'fedcba9876543210' } })
    expect(Buffer.from(twice).toString('latin1').match(/voto-a-voto\0/g)).toHaveLength(1)
  })
  it('what a chat app does (a re-encode) drops the keys, and the file says so', async () => {
    const withKeys = embedPngKeys(await make(), payload)
    const reencoded = new Uint8Array(await sharp(Buffer.from(withKeys)).png().toBuffer())
    expect(readPngKeys(reencoded)).toEqual({ ok: false, reason: 'no-keys' })
    expect(readPngKeys(new Uint8Array(await sharp(Buffer.from(withKeys)).jpeg().toBuffer()))).toEqual({ ok: false, reason: 'not-png' })
  })
  it('never throws on damage: truncated, garbage in the chunk, keys that are not keys', async () => {
    const withKeys = embedPngKeys(await make(), payload)
    expect(readPngKeys(withKeys.slice(0, 50)).ok).toBe(false)
    expect(readPngKeys(new Uint8Array([1, 2, 3]))).toEqual({ ok: false, reason: 'not-png' })
    const text = Buffer.from(withKeys)
    const at = text.indexOf('{"view"')
    text.write('{"vieX"', at)
    expect(readPngKeys(new Uint8Array(text))).toEqual({ ok: false, reason: 'bad-keys' })
    expect(readPngKeys(embedPngKeys(await make(), { ...payload, places: ['../x'] }))).toEqual({ ok: false, reason: 'bad-keys' })
    expect(() => embedPngKeys(new Uint8Array([1, 2, 3]), payload)).toThrow('not a PNG')
  })
})
