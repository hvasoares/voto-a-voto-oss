import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'
import { buildStamp } from './integrations/build-stamp'
import { cdn } from './integrations/cdn'
import { desktopShell } from './integrations/desktop-shell'
import { dataset, shardsModule } from './integrations/dataset'
import { factsGate } from './integrations/facts-gate'
import { interaction } from './integrations/interaction'
import { previewImages } from './integrations/preview-images'
import { themePlugin } from './integrations/theme'

// SITE_BASE: "/" (default) or "/voto-a-voto/" for the GitHub project Pages site.
const base = process.env.SITE_BASE ?? '/'

export default defineConfig({
  base,
  outDir: process.env.OUT_DIR ?? 'dist',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Astro 7.4: render the static pages across CPU cores with worker threads (docs
  // /reference/experimental-flags/parallel-prerender/) — the 23k-page real-dataset build is
  // component-render bound (72%), and single-process rendering was 2m40s of it.
  experimental: { parallelPrerender: true },
  integrations: [dataset(), buildStamp(), previewImages(), interaction(), cdn(), react(), factsGate()],
  vite: {
    plugins: [desktopShell(), shardsModule(), themePlugin(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: { fs: { allow: ['..'] } },
  },
})
