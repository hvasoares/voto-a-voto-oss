import { getViteConfig } from 'astro/config'

/**
 * The component tests (`*.astro.test.ts`, ticket #136): files that render `.astro` components through Astro's container. They need
 * Astro's own Vite plugins to compile a component, so they run with this config (`npm run test:components`); the plain
 * `vitest.config.ts` leaves them out. `npm test` runs both.
 */
export default getViteConfig({
  test: {
    include: ['src/**/*.astro.test.ts'],
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
