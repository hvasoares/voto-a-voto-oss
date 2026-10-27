/// <reference path="../.astro/types.d.ts" />
declare module 'virtual:theme.css'
declare module 'virtual:cdn-importmap' {
  /** JSON of the import map, or '' when nothing comes from a CDN. */
  const json: string
  export default json
}

declare namespace astroHTML.JSX {
  interface IntrinsicAttributes {
    'client:interaction'?: boolean
  }
}
