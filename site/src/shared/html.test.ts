import { describe, expect, it } from 'vitest'
import { html, raw } from './html'

describe('html', () => {
  it('escapes interpolated text but keeps nested markup', () => {
    expect(html`<p>${'<script>"x"</script>'}</p>`.value).toBe('<p>&lt;script&gt;&quot;x&quot;&lt;/script&gt;</p>')
    expect(html`<ul>${[1, 2].map((n) => html`<li>${n}</li>`)}</ul>`.value).toBe('<ul><li>1</li><li>2</li></ul>')
    expect(html`${raw('<b>x</b>')}`.value).toBe('<b>x</b>')
  })
  it('drops null, undefined and false', () => {
    expect(html`a${null}${undefined}${false}b`.value).toBe('ab')
  })
})
