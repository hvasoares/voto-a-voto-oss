/**
 * The identity tool's own contract (#113 ticket, definition 5): it must PASS on identical trees and FAIL on a
 * deliberate change — one byte changed in a page, one page removed, one page added — and on a stale approval.
 * Trees are built in a tmp dir; `diffTrees` is pure given two roots.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { diffTrees, displayLines, lineDiff, NORMALIZATIONS, type Approval } from './html-diff'

const root = mkdtempSync(join(tmpdir(), 'html-diff-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

/** A tiny two-page tree under `dir`; `mutate` tweaks the copy before writing. */
const tree = (name: string, mutate: (pages: Record<string, string>) => void = () => {}): string => {
  const pages: Record<string, string> = {
    'index.html': '<!doctype html><html><body><a href="/x/">X</a></body></html>\n',
    'x/index.html': '<!doctype html><html><body><p>The X page</p></body></html>\n',
    '_astro/app.AbC123.css': 'body{color:red}\n',
  }
  mutate(pages)
  const dir = join(root, name)
  for (const [path, content] of Object.entries(pages)) {
    const abs = join(dir, ...path.split('/'))
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, content)
  }
  return dir
}

describe('html-diff (the #113 identical-output tool)', () => {
  it('passes on identical trees', () => {
    const report = diffTrees(tree('a-same'), tree('b-same'))
    expect(report.ok).toBe(true)
    expect(report.pages.map((p) => p.status)).toEqual(['same', 'same', 'same'])
    expect(report.stale).toEqual([])
  })

  it('fails on one byte changed in a fixture page', () => {
    const report = diffTrees(
      tree('a-byte'),
      tree('b-byte', (p) => {
        p['index.html'] = p['index.html']!.replace('/x/', '/y/') // one byte
      }),
    )
    expect(report.ok).toBe(false)
    expect(report.pages.find((p) => p.path === 'index.html')?.status).toBe('different')
    expect(report.pages.filter((p) => p.status === 'same')).toHaveLength(2)
  })

  it('fails on a page removed (only-left) and on a page added (only-right)', () => {
    const removed = diffTrees(
      tree('a-only-left'),
      tree('b-only-left', (p) => {
        delete p['x/index.html']
      }),
    )
    expect(removed.ok).toBe(false)
    expect(removed.pages.find((p) => p.path === 'x/index.html')?.status).toBe('only-left')
    const added = diffTrees(tree('a-only-right'), tree('b-only-right', (p) => (p['y/index.html'] = '<html></html>\n')))
    expect(added.ok).toBe(false)
    expect(added.pages.find((p) => p.path === 'y/index.html')?.status).toBe('only-right')
  })

  it('an approval covers exactly its swap, and nothing more', () => {
    const approval: Approval = { path: 'index.html', oldText: '/x/', newText: '/y/', reason: 'the link target moved, invisible to visitors' }
    const covered = diffTrees(
      tree('a-approved'),
      tree('b-approved', (p) => {
        p['index.html'] = p['index.html']!.replace('/x/', '/y/')
      }),
      [approval],
    )
    expect(covered.ok).toBe(true)
    expect(covered.pages.find((p) => p.path === 'index.html')?.status).toBe('approved')
    // …but the same approval must NOT cover an extra, unlisted change on top of it.
    const extra = diffTrees(
      tree('a-approved-extra'),
      tree('b-approved-extra', (p) => {
        p['index.html'] = p['index.html']!.replace('/x/', '/y/').replace('</body>', '<p>unlisted</p></body>')
      }),
      [approval],
    )
    expect(extra.ok).toBe(false)
    expect(extra.pages.find((p) => p.path === 'index.html')?.status).toBe('different')
  })

  it('a stale approval (nothing matches) fails the run', () => {
    const report = diffTrees(tree('a-stale'), tree('b-stale'), [
      { path: 'index.html', oldText: '/gone/', newText: '/here/', reason: 'long done' },
    ])
    expect(report.ok).toBe(false)
    expect(report.stale).toHaveLength(1)
  })

  it('a non-HTML asset (CSS) is compared by hash too', () => {
    const report = diffTrees(
      tree('a-css'),
      tree('b-css', (p) => {
        p['_astro/app.AbC123.css'] = 'body{color:blue}\n'
      }),
    )
    expect(report.ok).toBe(false)
    expect(report.pages.find((p) => p.path === '_astro/app.AbC123.css')?.status).toBe('different')
  })

  it('ignores nothing silently: the normalisation list is empty and printed as none', () => {
    expect(NORMALIZATIONS).toEqual([])
  })

  it('the printed diff splits a minified page into one element per line', () => {
    expect(displayLines('<html><body><p>a</p></body></html>')).toEqual(['<html>', '<body>', '<p>a</p>', '</body>', '</html>'])
    const diff = lineDiff('<html><body><a href="/x/">X</a></body></html>', '<html><body><a href="/y/">X</a></body></html>')
    expect(diff).toContain('- <a href="/x/">X</a>')
    expect(diff).toContain('+ <a href="/y/">X</a>')
  })
})
