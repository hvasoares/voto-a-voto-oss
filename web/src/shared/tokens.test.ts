import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { colors, leading, steps, tokensCss, weights } from './tokens'

describe('design tokens', () => {
  it('are valid hex colours taken from the Sketch swatches', () => {
    for (const v of Object.values(colors)) expect(v).toMatch(/^#[0-9a-f]{6}$/)
    expect(colors.accent).toBe('#14505c')
    expect(colors.paper).toBe('#faf7f0')
  })
  it('are emitted as CSS custom properties', () => {
    const css = tokensCss()
    expect(css).toContain('--c-ink: #1c1b18;')
    expect(css).toContain('--font-serif:')
    expect(css).toContain('--gutter: 20px;')
  })

  it('the type scale is four sizes at a ratio of about 1.25, floor 13 px, two weights, and the stylesheet carries the same values', () => {
    const sizes = Object.values(steps)
    expect(sizes).toHaveLength(4)
    expect(Math.min(...sizes)).toBe(13)
    for (const [i, v] of sizes.slice(1).entries()) expect(v / sizes[i]!).toBeCloseTo(1.25, 0)
    expect(Object.values(weights)).toEqual([400, 700])
    const css = readFileSync('src/styles/scale.css', 'utf8')
    for (const [k, v] of Object.entries(steps)) expect(css).toContain(`--step-${k}: ${v}px;`)
    for (const [k, v] of Object.entries(leading)) expect(css).toContain(`--lh-${k}: ${v};`)
    expect(css).toContain(`--fw-regular: ${weights.regular}; --fw-bold: ${weights.bold};`)
  })
})
