import { describe, expect, it } from 'vitest'
import { colors, fonts, layout, radius } from '@/shared/tokens'
import { BIN_COLOR } from '@/lib/scale'
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
    // the two party swatches the compare screens and screen 13 paint bars with: --c-lula / --c-bolsonaro (bg-lula reads them), no alias
    expect(vars['--c-lula']).toBe(colors.lula)
    expect(vars['--c-bolsonaro']).toBe(colors.bolsonaro)
    expect(vars['--sketch-lula']).toBeUndefined()
    expect(vars['--sketch-bolsonaro']).toBeUndefined()
    expect(vars['--radius']).toBe(`${radius.control}px`)
    expect(vars['--gutter']).toBe(`${layout.gutter}px`)
  })

  // Every page inlines this block (City card HTML margin, private#121): a swatch is emitted once, as --c-<name>.
  it('emits each swatch once: no second copy of the palette under another prefix', () => {
    const names = Object.keys(vars)
    expect(names.filter((n) => n.startsWith('--sketch-color-') || n.startsWith('--sketch-div-') || n === '--sketch-lula' || n === '--sketch-bolsonaro')).toEqual([])
    for (const bin of Object.values(BIN_COLOR)) expect(names, bin).toContain(bin.slice(4, -1))
  })

  it('emits one :root block with all the variables', () => {
    const css = themeCss()
    expect(css.match(/:root\s*{/g)).toHaveLength(1)
    expect(css).toContain(`--background: ${colors.paper};`)
  })
})
