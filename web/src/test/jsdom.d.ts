/** The one corner of jsdom the guards use (`place-mentions.ts`): parse a string of HTML and read its document. jsdom ships no types and the project has no `@types/jsdom`. */
declare module 'jsdom' {
  export class JSDOM {
    constructor(html: string)
    window: { document: Document }
  }
}
