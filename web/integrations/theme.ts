import type { Plugin } from 'vite'
import { themeCss } from '../src/theme'

/** `import 'virtual:theme.css'` gives the Sketch tokens as shadcn/Tailwind theme variables (see src/theme.ts). */
export function themePlugin(): Plugin {
  const id = 'virtual:theme.css'
  return {
    name: 'voto-theme',
    resolveId: (source) => (source === id ? '\0' + id : undefined),
    load: (source) => (source === '\0' + id ? themeCss() : undefined),
  }
}
