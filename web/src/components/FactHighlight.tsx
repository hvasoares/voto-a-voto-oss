import { useEffect, useMemo, useState } from 'react'
import { parseFactPage, type FactCard } from '@/lib/facts/parse'

/**
 * The sentence-to-data highlight of the state's three-cycles page (#62), the page's one island, loaded with `client:media="(min-width: 1024px)"`: a phone
 * downloads none of it. It draws nothing on the server. In the browser it reads the records from the page of the calculation (`href`), lists the sentences
 * as buttons and a small table of the figures; choosing a sentence (click, tap, Enter or Space) lights the bar segment (`[data-seg]` of the page) and the
 * table cell it is about, and writes the calculation beside it. The same text is announced through a polite live region, so a highlighted value is
 * readable by keyboard and by touch, never only by hover. Escape clears it. The words on the buttons are the records' own sentences.
 * Styles are inline on purpose: the phone's stylesheet does not grow for a desktop-only island.
 */
export interface FactHighlightProps {
  /** Address of the page of the calculation (base included, no fragment). */
  href: string
  /** The calculation link's words (catalog key `fact.link`), given by the page. */
  calcLabel: string
}

const ACCENT = '#14505c'
const MUTED = '#6a6558'
const RULE = '#d9d3c3'
const PAPER2 = '#f1ecdf'
/** A sentence is about one cycle: its change line (or the start of the series). It lights that cycle's left segment and the cells of the share and of the change. */
const cycleOf = (anchor: string) => anchor.split('-')[0]!
const SENTENCES = /-variacao$/
const YEARS = (cards: FactCard[]) => [...new Set(cards.map((c) => c.anchor.split('-')[0]!))]
const KEYS = [['a', 'Parcela A'], ['b', 'Parcela B'], ['variacao', 'Variação']] as const

export default function FactHighlight({ href, calcLabel }: FactHighlightProps) {
  const [cards, setCards] = useState<FactCard[]>([])
  const [active, setActive] = useState<string | undefined>()
  const plain = typeof document !== 'undefined' && document.documentElement.dataset.register === 'plain'

  useEffect(() => {
    let live = true
    fetch(href)
      .then((r) => (r.ok ? r.text() : ''))
      .then((html) => live && setCards(html ? parseFactPage(html) : []))
      .catch(() => live && setCards([]))
    return () => {
      live = false
    }
  }, [href])

  // The bar segments are the page's own markup: light the one that matches, put the others back.
  useEffect(() => {
    const segs = [...document.querySelectorAll<HTMLElement>('[data-seg]')]
    for (const s of segs) {
      const on = !!active && s.dataset.seg === `${cycleOf(active)}-a`
      s.style.outline = on ? `3px solid ${ACCENT}` : ''
      s.style.outlineOffset = on ? '2px' : ''
      s.style.position = on ? 'relative' : ''
      s.style.zIndex = on ? '1' : ''
    }
    return () => segs.forEach((s) => (s.style.outline = ''))
  }, [active])

  const byAnchor = useMemo(() => new Map(cards.map((c) => [c.anchor, c])), [cards])
  const current = active ? byAnchor.get(active) : undefined
  // The calculation beside it: the share the sentence is about, then the change.
  const share = active ? byAnchor.get(`${cycleOf(active)}-a`) : undefined
  if (cards.length === 0) return null

  const choose = (anchor: string) => setActive((a) => (a === anchor ? undefined : anchor))
  return (
    <section aria-label="Frases e números do estado" data-fact-highlight onKeyDown={(e) => e.key === 'Escape' && setActive(undefined)} style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
      <div>
        <h2 style={{ font: '400 var(--step-3)/var(--lh-3) var(--font-serif)', margin: 0 }}>Frases e números</h2>
        <p style={{ font: '400 var(--step-1)/var(--lh-1) var(--font-sans)', color: MUTED, margin: '4px 0 0' }}>Escolha uma frase para ver a barra, a célula da tabela e o cálculo.</p>
        <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cards.filter((c) => SENTENCES.test(c.anchor)).map((c) => (
            <li key={c.anchor}>
              <button
                type="button"
                aria-pressed={active === c.anchor}
                onClick={() => choose(c.anchor)}
                data-fact-sentence={c.anchor}
                style={{ width: '100%', minHeight: 44, textAlign: 'left', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', font: '400 var(--step-1)/var(--lh-1) var(--font-sans)', color: 'inherit', background: active === c.anchor ? PAPER2 : 'transparent', border: `1px solid ${active === c.anchor ? ACCENT : RULE}` }}
              >
                {plain ? c.sentences.plain : c.sentences.standard}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <table data-fact-table style={{ width: '100%', borderCollapse: 'collapse', font: '400 var(--step-1)/var(--lh-1) var(--font-sans)' }}>
          <caption style={{ textAlign: 'left', font: '400 var(--step-1)/var(--lh-1) var(--font-sans)', color: MUTED, paddingBottom: 4 }}>Os números das barras, por ciclo</caption>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'left', padding: '4px 6px' }}>Ciclo</th>
              {KEYS.map(([k, label]) => <th key={k} scope="col" style={{ textAlign: 'left', padding: '4px 6px' }}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {YEARS(cards).map((ano) => (
              <tr key={ano}>
                <th scope="row" style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 700 }}>{ano}</th>
                {KEYS.map(([k]) => {
                  const c = byAnchor.get(`${ano}-${k}`)
                  const on = !!active && !!c && (c.anchor === `${cycleOf(active)}-a` || c.anchor === active)
                  return (
                    <td key={k} data-cell={`${ano}-${k}`} style={{ padding: '4px 6px', border: `1px solid ${on ? ACCENT : RULE}`, background: on ? PAPER2 : 'transparent', fontWeight: on ? 700 : 400 }}>
                      {c?.shown || '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div role="status" aria-live="polite" data-fact-calc style={{ marginTop: 16, padding: current ? '12px 14px' : 0, border: current ? `1px solid ${ACCENT}` : 'none', borderRadius: 12, background: current ? PAPER2 : 'transparent' }}>
          {current && (
            <>
              <p style={{ font: '700 var(--step-1)/var(--lh-1) var(--font-sans)', margin: 0 }}>Destacado: {(share ?? current).title}</p>
              {[share, current].filter((c): c is FactCard => !!c).filter((c, i, all) => all.indexOf(c) === i).map((c) => (
                <div key={c.anchor}>
                  <dl style={{ margin: '8px 0 0', font: '400 var(--step-1)/var(--lh-1) var(--font-sans)' }}>
                    {c.inputs.map((i) => (
                      <div key={i.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <dt>{i.label}</dt>
                        <dd style={{ margin: 0, color: MUTED }}>{i.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p style={{ font: '400 var(--step-1)/var(--lh-1) var(--font-sans)', margin: '8px 0 0' }}>{c.formula}</p>
                  {c.worked.map((w) => (
                    <p key={w} style={{ font: '400 var(--step-1)/var(--lh-1) var(--font-sans)', margin: '2px 0 0' }}>{w}</p>
                  ))}
                </div>
              ))}
              <a href={`${href}#${(share ?? current).anchor}`} style={{ display: 'inline-block', marginTop: 8, font: '700 var(--step-1)/var(--lh-1) var(--font-sans)', color: ACCENT }}>{calcLabel} ›</a>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
