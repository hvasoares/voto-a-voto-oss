/**
 * Design tokens taken from the Sketch page "Election SPA v2" (swatches `v2/*`, text styles of the
 * frames). Source of truth for the CSS custom properties written to assets/app.css at build time.
 * Change a value here and every screen follows; screens must never hard-code colours or sizes.
 */
export const colors = {
  ink: '#1c1b18', // v2/ink
  paper: '#faf7f0', // v2/paper (page background)
  'paper-2': '#f1ecdf', // v2/paper-2 (tab tracks, tiles)
  rule: '#d9d3c3', // v2/rule (hairlines, input borders)
  muted: '#6a6558', // v2/muted (secondary text)
  ring: '#a39d8e', // v2/ring
  accent: '#14505c', // v2/accent (links, active tab, primary button)
  'accent-fg': '#faf7f0', // v2/accent-fg (text on accent)
  flag: '#d9a21b', // v2/flag ("EXEMPLO" banner)
  'cand-a': '#2a2926', // v2/cand-a
  'cand-b': '#8b8274', // v2/cand-b
  'cand-outros': '#b6ae9d', // round 1: all candidates but the two leaders (added by #5; not a Sketch swatch)
  abstencao: '#d5cfbf', // v2/abstencao
  brancos: '#e3decf', // v2/brancos
  nulos: '#ede9db', // v2/nulos
  lula: '#b02b27', // v2/lula
  bolsonaro: '#0c54a0', // v2/bolsonaro
  'div-zero': '#efebe0',
  'div-pos-1': '#f0a9a0',
  'div-pos-2': '#d15c53',
  'div-pos-3': '#9b1f1d',
  'div-neg-1': '#99c1f4',
  'div-neg-2': '#4087de',
  'div-neg-3': '#0052ab',
  'seq-1': '#eef3f1', // one-direction teal scale of "Ficaram em casa" (#32), lightest to darkest
  'seq-2': '#cfe0e0',
  'seq-3': '#a5c6ca',
  'seq-4': '#74a5ad',
  'seq-5': '#38707d',
  'seq-6': '#24606c',
  'seq-7': '#14404b',
} as const

export const fonts = {
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
} as const

/** px values read from the frames: brand 20, page title 30, section 18, body 15, small 12. */
export const type = { brand: 20, title: 30, section: 18, lead: 16, body: 15, small: 12, tiny: 10 } as const

/** Page gutter is 20px in every frame; frames are 390px wide. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const

export const radius = { control: 4 } as const
export const layout = { frameWidth: 390, frameHeight: 844, gutter: 20, minTap: 44 } as const

export function tokensCss(): string {
  const lines = [
    ...Object.entries(colors).map(([k, v]) => `  --c-${k}: ${v};`),
    `  --font-serif: ${fonts.serif};`,
    `  --font-sans: ${fonts.sans};`,
    ...Object.entries(type).map(([k, v]) => `  --fs-${k}: ${v}px;`),
    ...Object.entries(space).map(([k, v]) => `  --sp-${k}: ${v}px;`),
    `  --radius: ${radius.control}px;`,
    `  --gutter: ${layout.gutter}px;`,
    `  --min-tap: ${layout.minTap}px;`,
  ]
  return `:root {\n${lines.join('\n')}\n}\n`
}
