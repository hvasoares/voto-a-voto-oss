/// <reference path="../.astro/types.d.ts" />
declare module 'virtual:theme.css'

declare namespace astroHTML.JSX {
  interface IntrinsicAttributes {
    'client:interaction'?: boolean
  }
}
