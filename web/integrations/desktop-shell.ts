import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/** Where the desktop shell's module is served in a build (src/layouts/Base.astro loads it from this path under the site base). */
export const DESKTOP_SHELL_FILE = '_astro/desktop-shell.js'
/** The shell's second entry: React and the city search, loaded on the first interaction (same directory, found by file name). */
const SEARCH_FILE = '_astro/topbar-search.js'

/**
 * Emits src/scripts/desktop-shell.ts and topbar-search.ts as entries of their own with a fixed file name (#51).
 *
 * Why: the shell is wanted only at 1024 px and up. A `import()` of it from a page script makes the bundler add its
 * 1.6 KB preload helper (and the call) to the script EVERY page loads, phones included. A fixed address lets Base.astro load
 * it from a 100-byte inline stub behind a media check instead, so a phone downloads nothing for it. The module's own imports
 * (React, the city search) are ordinary hashed chunks, shared with the islands.
 */
export function desktopShell(): Plugin {
  const entry = (name: string) => fileURLToPath(new URL(`../src/scripts/${name}.ts`, import.meta.url))
  return {
    name: 'voto-desktop-shell',
    apply: 'build',
    applyToEnvironment: (environment) => environment.name === 'client',
    buildStart() {
      this.emitFile({ type: 'chunk', id: entry('desktop-shell'), fileName: DESKTOP_SHELL_FILE })
      this.emitFile({ type: 'chunk', id: entry('topbar-search'), fileName: SEARCH_FILE })
    },
  }
}
