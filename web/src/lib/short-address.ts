/** `https://votoavoto.exemplo.br/rj/cidade-exemplo/` -> `votoavoto.exemplo.br/rj/cidade-exemplo` (what a picture or screen shows). Pure and tiny: the browser pages import it without `share-text.ts`. */
export function shortAddress(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '')
}
