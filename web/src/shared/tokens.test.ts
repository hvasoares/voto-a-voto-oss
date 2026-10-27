import { describe, expect, it } from 'vitest'
import { colors, tokensCss } from './tokens'

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
})
