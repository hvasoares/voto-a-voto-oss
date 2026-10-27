import { describe, expect, it } from 'vitest'
import { colors, fonts, layout, radius } from '@/shared/tokens'
import { shadcnVariables, themeCss } from './theme'

describe('Sketch tokens mapped onto the shadcn theme variables', () => {
  const vars = shadcnVariables()

  it('maps every shadcn colour variable to a Sketch swatch (no stray oklch default)', () => {
    expect(vars['--background']).toBe(colors.paper)
    expect(vars['--foreground']).toBe(colors.ink)
    expect(vars['--primary']).toBe(colors.accent)
    expect(vars['--primary-foreground']).toBe(colors['accent-fg'])
    expect(vars['--muted']).toBe(colors['paper-2'])
    expect(vars['--muted-foreground']).toBe(colors.muted)
    expect(vars['--border']).toBe(colors.rule)
    expect(vars['--input']).toBe(colors.rule)
    for (const [name, value] of Object.entries(vars)) expect(value, name).not.toMatch(/oklch/)
  })

  it('uses the Sketch fonts, the 4 px radius and the 20 px gutter', () => {
    expect(vars['--sketch-font-sans']).toBe(fonts.sans)
    expect(vars['--sketch-font-serif']).toBe(fonts.serif)
    expect(vars['--radius']).toBe(`${radius.control}px`)
    expect(vars['--gutter']).toBe(`${layout.gutter}px`)
  })

  it('emits one :root block with all the variables', () => {
    const css = themeCss()
    expect(css.match(/:root\s*{/g)).toHaveLength(1)
    expect(css).toContain(`--background: ${colors.paper};`)
  })
})
