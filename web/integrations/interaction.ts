import type { AstroIntegration } from 'astro'

/** Registers the `client:interaction` directive. Types: src/env.d.ts. */
export function interaction(): AstroIntegration {
  return {
    name: 'voto-client-interaction',
    hooks: {
      'astro:config:setup': ({ addClientDirective }) => {
        addClientDirective({ name: 'interaction', entrypoint: new URL('./interaction-directive.js', import.meta.url).pathname })
      },
    },
  }
}
