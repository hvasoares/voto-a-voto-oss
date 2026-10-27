import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'
import { cdn } from './integrations/cdn'
import { dataset } from './integrations/dataset'
import { interaction } from './integrations/interaction'
import { themePlugin } from './integrations/theme'

// SITE_BASE: "/" (default) or "/voto-a-voto/" for the GitHub project Pages site.
const base = process.env.SITE_BASE ?? '/'

export default defineConfig({
  base,
  outDir: process.env.OUT_DIR ?? 'dist',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [dataset(), interaction(), cdn(), react()],
  vite: {
    plugins: [themePlugin(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@site': fileURLToPath(new URL('../site/src', import.meta.url)),
      },
    },
    server: { fs: { allow: ['..'] } },
  },
})
