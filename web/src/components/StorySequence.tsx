import { useCallback, useEffect, useRef, useState } from 'react'
import ShareActions from '@/components/ShareActions'
import { useIslandReady } from '@/components/use-island-ready'

/**
 * The swipeable sequence of vertical cards (#47, reused by #97): the cards are pre-rendered as a stacked list in the page (complete without scripts, each with its anchor `#1`, `#2`...), and
 * this island turns the list into a row you swipe, with a progress indicator, the arrow keys, Home and End, and the share actions of the card on show (the existing share flow: the picture of
 * THAT card and the link to its position). The card on show is in the address (`#2`), so reloading or forwarding the link reproduces it. No autoplay; with reduced motion the move is instant.
 * Only the latest request wins: the card on show is derived from where the row rests (after the scroll settles) or from the last tap or key, never from an older one.
 * The sentences come in as props (the page writes them from the catalog), so the island carries none. `data-ready` and `data-current` are for the specs.
 */
export interface StoryCardView {
  n: number
  svg: string
  /** The message that goes with the picture (ends with the link to this card) and the link itself. */
  text: string
  link: string
  filename: string
  caption: string
  /** `votoavoto.exemplo.br/sp/historia#2` */
  address: string
  /** The card's the calculation link link, as the page's markup. */
  calc?: string
}

export interface StorySequenceProps {
  cards: StoryCardView[]
  /** The sequence's own words. */
  words: { region: string; dots: string; dot: string; share: string; linkNote: string; nojs: string }
  /** Counters of the screen that uses it (#97's story_opened, card_reached, card_shared). */
  onOpened?: () => void
  onReached?: (n: number) => void
  onShared?: (n: number) => void
  /** Escape closes the sequence (the screen that opened it decides where it goes back to); without it Escape does nothing. */
  onClose?: () => void
}

const fill = (tpl: string, params: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (whole, k: string) => (k in params ? String(params[k]) : whole))
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const fromHash = (max: number) => {
  const n = Number(decodeURIComponent(location.hash.slice(1)))
  return Number.isInteger(n) && n >= 1 && n <= max ? n : 1
}

export default function StorySequence({ cards, words, onOpened, onReached, onShared, onClose }: StorySequenceProps) {
  const [enhanced, setEnhanced] = useState(false)
  const [current, setCurrent] = useState(1)
  const island = useIslandReady('story-sequence')
  const track = useRef<HTMLOListElement>(null)
  const settle = useRef<number | undefined>(undefined)
  /** While a move made by a tap or a key is still scrolling, where the row happens to be is not an answer (an older scroll must never replace the newer choice). */
  const lockUntil = useRef(0)
  const last = cards.length

  /** Centres card `n` in the row by moving the row only (never the page, which stays where the visitor is). */
  const centre = (n: number, behavior: ScrollBehavior) => {
    const el = track.current
    const c = el?.children[n - 1] as HTMLElement | undefined
    if (!el || !c) return
    const a = el.getBoundingClientRect()
    const b = c.getBoundingClientRect()
    el.scrollTo({ left: el.scrollLeft + (b.left - a.left) - (el.clientWidth - b.width) / 2, behavior })
  }
  /** Moves the row to card `n` and says so (the last call wins; the scroll that follows only confirms it). */
  const goTo = useCallback(
    (n: number) => {
      const next = Math.min(last, Math.max(1, n))
      setCurrent(next)
      window.clearTimeout(settle.current)
      lockUntil.current = reduced() ? 0 : performance.now() + 900
      centre(next, reduced() ? 'auto' : 'smooth')
    },
    [last],
  )

  // Hydrated: the list becomes the row, and (once the row's layout is committed, never before) it is put at the card the address names.
  useEffect(() => {
    setEnhanced(true)
    setCurrent(fromHash(last))
  }, [last])
  useEffect(() => {
    if (!enhanced) return
    const n = fromHash(last)
    // The browser jumped the page to the card's anchor before this ran; the card is in the row, so the page goes back to its top.
    window.scrollTo({ top: 0 })
    centre(n, 'auto')
    requestAnimationFrame(() => {
      centre(n, 'auto')
      island.markReady()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhanced, last])
  const ready = island.dataReady === 'yes'

  // The card on show is in the address; a counter hears it when it is reached.
  const reached = useRef(0)
  useEffect(() => {
    if (!ready) return
    history.replaceState(null, '', `#${current}`)
    if (reached.current !== current) {
      reached.current = current
      onReached?.(current)
    }
  }, [current, ready, onReached])

  // The row rests on a card: that card is on show (after the scroll settles, so a swipe in motion does not flicker).
  const rest = () => {
    const wait = lockUntil.current - performance.now()
    // A move by tap or key is still on its way: look again when it should have arrived.
    if (wait > 0) {
      settle.current = window.setTimeout(rest, wait + 40)
      return
    }
    const el = track.current
    if (!el) return
    const mid = el.getBoundingClientRect().left + el.clientWidth / 2
    let best = 1
    let gap = Infinity
    for (const [i, c] of [...el.children].entries()) {
      const r = (c as HTMLElement).getBoundingClientRect()
      const d = Math.abs(r.left + r.width / 2 - mid)
      if (d < gap) ((gap = d), (best = i + 1))
    }
    setCurrent(best)
  }
  const onScroll = () => {
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(rest, 90)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onClose) return onClose()
    const to = e.key === 'ArrowRight' ? current + 1 : e.key === 'ArrowLeft' ? current - 1 : e.key === 'Home' ? 1 : e.key === 'End' ? last : undefined
    if (to === undefined) return
    e.preventDefault()
    goTo(to)
  }

  const shown = cards[current - 1]!
  return (
    <section className="story" data-story data-enhanced={enhanced} data-ready={island.dataReady} data-current={current} data-count={last}>
      <ol ref={track} className="story__track" tabIndex={enhanced ? 0 : undefined} role={enhanced ? 'region' : undefined} aria-roledescription={enhanced ? 'carousel' : undefined} aria-label={enhanced ? words.region : undefined} onScroll={onScroll} onKeyDown={onKeyDown}>
        {cards.map((c) => (
          <li key={c.n} id={String(c.n)} className="story__card" data-card={c.n} aria-current={enhanced ? c.n === current : undefined} aria-label={c.caption}>
            <div className="story__pic" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <p className="story__cap">{c.caption}</p>
            {c.calc && <p className="story__calc" dangerouslySetInnerHTML={{ __html: c.calc }} />}
            {!enhanced && <a className="story__link" href={`#${c.n}`}>{c.address}</a>}
          </li>
        ))}
      </ol>
      {enhanced ? (
        <>
          <div className="story__dots" role="group" aria-label={words.dots}>
            {cards.map((c) => (
              <button key={c.n} type="button" className="story__dot" aria-label={fill(words.dot, { n: c.n })} aria-current={c.n === current} onClick={() => goTo(c.n)} />
            ))}
          </div>
          <p className="story__now" aria-live="polite" data-caption>{shown.caption}</p>
          <ShareActions text={shown.text} svg={shown.svg} filename={shown.filename} link={shown.link} primaryLabel={words.share} textHidden onOpened={onOpened} onShared={() => onShared?.(current)} />
          <p className="story__note">{fill(words.linkNote, { address: shown.address })}</p>
        </>
      ) : (
        <p className="story__note story__nojs">{words.nojs}</p>
      )}
    </section>
  )
}
