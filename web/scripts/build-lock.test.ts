import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { withBuildLock } from './build-lock'

const root = mkdtempSync(join(tmpdir(), 'build-lock-test-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

describe('withBuildLock (#117)', () => {
  it('runs the callback and returns its value', () => {
    expect(withBuildLock(root, () => 42)).toBe(42)
  })

  it('releases the lock when the callback throws, so the next build is not blocked', () => {
    expect(() => withBuildLock(root, () => { throw new Error('build failed') })).toThrow('build failed')
    expect(withBuildLock(root, () => 'next')).toBe('next')
  })

  it('a different checkout path has its own lock', () => {
    let inner = 'not run'
    withBuildLock(root, () => {
      withBuildLock(`${root}-other`, () => { inner = 'other checkout ran' })
    })
    expect(inner).toBe('other checkout ran')
  })
})
