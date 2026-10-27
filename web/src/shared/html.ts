/** Tiny HTML templating with escaping by default. Slots render to strings so the same code pre-renders in Node and runs in the browser. */
export class Raw {
  constructor(readonly value: string) {}
  toString() {
    return this.value
  }
}

export const raw = (s: string) => new Raw(s)

export function esc(v: unknown): string {
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

type Part = unknown

function render(v: Part): string {
  if (v instanceof Raw) return v.value
  if (Array.isArray(v)) return v.map(render).join('')
  if (v === null || v === undefined || v === false) return ''
  return esc(v)
}

/** html`<p>${userText}</p>` escapes userText; nested html`...` results and raw() are kept as markup. */
export function html(strings: TemplateStringsArray, ...values: Part[]): Raw {
  return new Raw(strings.reduce((out, s, i) => out + s + (i < values.length ? render(values[i]) : ''), ''))
}
