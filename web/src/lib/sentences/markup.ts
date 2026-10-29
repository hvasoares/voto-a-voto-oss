/**
 * A catalog sentence with markup in its slots (#184), as `calcLink` is markup beside a figure: `messageHtml` fills the template of `key` like `message` does, but a slot
 * may be markup (`Raw`, a link built by `placeLinkHtml` or `html`...) instead of text, so "Cidade parecida: {name} · {uf}" carries a link in each slot. The words of the sentence
 * and every text slot are escaped; only a `Raw` is kept as it is. The wording stays the catalog's: no page splits a sentence to put a link in it.
 */
import { esc, raw, Raw } from '../../shared/html'
import { template, type Key, type Voice } from './catalog'

export function messageHtml(voice: Voice, key: Key, params: Record<string, string | number | Raw> = {}): Raw {
  return raw(
    template(voice, key)
      .split(/(\{\w+\})/)
      .map((part) => {
        const slot = /^\{(\w+)\}$/.exec(part)?.[1]
        if (slot === undefined) return esc(part)
        const value = params[slot]
        return value === undefined ? esc(part) : value instanceof Raw ? value.value : esc(value)
      })
      .join(''),
  )
}
