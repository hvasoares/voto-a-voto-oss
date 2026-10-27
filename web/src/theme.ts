/**
 * The ONE place where the Sketch design tokens (site/src/shared/tokens.ts) become the shadcn/Tailwind theme.
 * shadcn components read CSS variables (--background, --primary, ...); this file sets them from the Sketch swatches.
 * src/styles/global.css only declares which Tailwind utilities read those variables (`@theme inline`).
 * Change a colour in tokens.ts and every shadcn component follows.
 */
import { colors, fonts, layout, radius, type } from '@site/shared/tokens'

export function shadcnVariables(): Record<string, string> {
  return {
    '--background': colors.paper,
    '--foreground': colors.ink,
    '--card': colors.paper,
    '--card-foreground': colors.ink,
    '--popover': colors.paper,
    '--popover-foreground': colors.ink,
    '--primary': colors.accent,
    '--primary-foreground': colors['accent-fg'],
    '--secondary': colors['paper-2'],
    '--secondary-foreground': colors.ink,
    '--muted': colors['paper-2'],
    '--muted-foreground': colors.muted,
    '--accent': colors['paper-2'],
    '--accent-foreground': colors.ink,
    '--destructive': colors.lula,
    '--border': colors.rule,
    '--input': colors.rule,
    '--ring': colors.accent,
    '--radius': `${radius.control}px`,
    // Every Sketch swatch as --c-<name>, so markup can use arbitrary-value utilities
    // (bg-[var(--c-lula)], text-[var(--c-muted-foreground)]...). The shadcn variables above
    // cover named UI roles; bars and banners need the raw swatches (ticket #10).
    ...Object.fromEntries(Object.entries(colors).map(([k, v]) => [`--c-${k}`, v])),
    '--sketch-font-sans': fonts.sans,
    '--sketch-font-serif': fonts.serif,
    '--gutter': `${layout.gutter}px`,
    '--min-tap': `${layout.minTap}px`,
    ...Object.fromEntries(Object.entries(type).map(([k, v]) => [`--sketch-text-${k}`, `${v}px`])),
  }
}

/** One :root block with every variable. */
export function themeCss(): string {
  const vars = Object.entries(shadcnVariables()).map(([k, v]) => `  ${k}: ${v};`)
  return `:root {\n${vars.join('\n')}\n}\n`
}
