/// <reference path="../.astro/types.d.ts" />
/// <reference types="vite/client" />
declare module 'virtual:theme.css'
// A component test (`*.astro.test.ts`, #136) imports an .astro file and renders it through Astro's container.
declare module '*.astro' {
  const component: import('astro/runtime/server/index.js').AstroComponentFactory
  export default component
}
declare module 'virtual:cdn-importmap' {
  /** JSON of the import map, or '' when nothing comes from a CDN. */
  const json: string
  export default json
}
declare module 'virtual:data-shards' {
  /** The served shards version (the `v…` directory name under data/), from the dataset fingerprint of this build. */
  export const SHARD_VERSION: string
}

interface ImportMetaEnv {
  /** GA4 measurement id of ticket #20 ("G-…"), empty/absent → analytics is a strict no-op and the build passes. */
  readonly PUBLIC_GA_MEASUREMENT_ID?: string
  /** Unprefixed alias accepted when a build pipes the id through (the browser bundle sees PUBLIC_* only). */
  readonly GA_MEASUREMENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace astroHTML.JSX {
  interface IntrinsicAttributes {
    'client:interaction'?: boolean
    /** Lazy map slot (#55): in view from 1024 px up, on first interaction below it. */
    'client:slot'?: boolean
    /** Dashboard panel (#75): `client:media(min-width: 1024px)` and `client:visible` in one. */
    'client:panel'?: boolean
  }
}