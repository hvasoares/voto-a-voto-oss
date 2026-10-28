/** The city replay (#46) of the three-cycle page: one short sequence 2018 -> 2022 -> 2026 drawn from the numbers the page's own static blocks already carry (the shares of each cycle's bar),
 * in the browser. Nothing is fetched and nothing is computed: the static blocks below stay as the card for visitors who prefer reduced motion, for scripts that do not run and for chat previews.
 * Only the latest request wins (a round switch or a tap while a step is waiting never lets an old step draw). Marks `data-replay` (ready) and `data-replay-year` (the cycle on show) for the e2e specs. Browser only. */
// The replay's stylesheet travels with its script and is added to the page when a replay is drawn: inlined in each of the 5.570 pages it was 1.9 KB a page (10 MB of the site).
import css from '@/styles/replay.css?inline'
import { buildReplay, missingText, replayAlt, say, type Replay, type ReplaySide } from '@/lib/replay'

const STEP_MS = 1700
const SVG = 'http://www.w3.org/2000/svg'
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => Object.assign(document.createElement(tag), { className: className ?? '', textContent: text ?? '' })
const short = (label: string) => label.replace(/^Candidato /, '')

/** The shares the static block of the round on show carries, cycle by cycle (a block with no result has none). */
export function readCycles(panel: Element): { ano: number; sides?: ReplaySide[] }[] {
  return [...panel.querySelectorAll<HTMLElement>('.cycle[data-ano]')].map((c) => ({
    ano: Number(c.dataset.ano),
    sides: [...(c.querySelector('.bar')?.querySelectorAll<HTMLElement>('.bar__seg[data-pct]') ?? [])].map((s) => ({
      key: (['a', 'b', 'outros'].find((k) => s.classList.contains(`bar__seg--${k}`)) ?? 'outros') as ReplaySide['key'],
      label: (s.title.split(':')[0] ?? '').trim(),
      pct: Number(s.dataset.pct),
    })),
  }))
}

export interface ReplayHandle {
  destroy(): void
}

export function mountReplay(panel: HTMLElement, city: string, turno: number): ReplayHandle | undefined {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
  const replay: Replay = buildReplay(readCycles(panel))
  if (!replay.frames.length) return undefined
  const years = [...new Set(replay.frames.flatMap((f) => f.sides.map((s) => s.key)))]
  if (!document.querySelector('style[data-replay-css]')) {
    const style = el('style', undefined, css)
    style.dataset.replayCss = ''
    document.head.append(style)
  }
  const box = el('section', 'replay')
  box.setAttribute('role', 'group')
  box.setAttribute('aria-label', replayAlt(replay, city, turno))
  const play = el('button', 'replay__btn', say('replay.pause'))
  play.type = 'button'
  box.append(Object.assign(el('div', 'replay__top'), {}))
  box.firstElementChild!.append(el('p', 'replay__tag', say('replay.tag')), ...(replay.frames.length > 1 ? [play] : []))
  const year = el('p', 'replay__year')
  year.setAttribute('aria-hidden', 'true')
  const bar = el('div', 'replay__bar')
  bar.setAttribute('aria-hidden', 'true')
  const segs = new Map(years.map((k) => [k, bar.appendChild(el('span', `replay__seg replay__seg--${k}`))]))
  const track = document.createElementNS(SVG, 'svg')
  track.setAttribute('class', 'replay__track')
  track.setAttribute('viewBox', '0 0 300 20')
  track.setAttribute('aria-hidden', 'true')
  const line = document.createElementNS(SVG, 'line')
  for (const [k, v] of Object.entries({ x1: '50', x2: '250', y1: '10', y2: '10' })) line.setAttribute(k, v)
  track.append(line)
  const dots = el('div', 'replay__dots')
  dots.setAttribute('role', 'group')
  dots.setAttribute('aria-label', say('replay.scrub'))
  const marks = new Map<number, SVGCircleElement>()
  const buttons = new Map<number, HTMLButtonElement>()
  ;[2018, 2022, 2026].forEach((ano, i) => {
    const c = document.createElementNS(SVG, 'circle')
    for (const [k, v] of Object.entries({ cx: String(50 + i * 100), cy: '10', r: '6' })) c.setAttribute(k, v)
    if (replay.missing.includes(ano)) c.setAttribute('class', 'is-missing')
    track.append(c)
    marks.set(ano, c)
    const b = el('button', 'replay__dot', String(ano))
    b.type = 'button'
    b.disabled = replay.missing.includes(ano)
    b.addEventListener('click', () => go(replay.frames.findIndex((f) => f.ano === ano), false))
    buttons.set(ano, b)
    dots.append(b)
  })
  box.append(year, bar, track, dots)
  const missing = missingText(replay)
  if (missing) box.append(el('p', 'replay__missing', missing))
  box.append(el('p', 'replay__note', say('replay.note')))

  let index = 0
  let timer: number | undefined
  let token = 0
  const draw = (i: number) => {
    const f = replay.frames[i]!
    year.textContent = String(f.ano)
    for (const [k, seg] of segs) {
      const side = f.sides.find((s) => s.key === k)
      seg.style.flexGrow = String(side?.pct ?? 0)
      seg.textContent = side && side.pct >= 15 ? `${short(side.label)} ${side.pct}%` : ''
    }
    for (const [ano, c] of marks) c.classList.toggle('is-now', ano === f.ano)
    for (const [ano, b] of buttons) b.setAttribute('aria-current', String(ano === f.ano))
    box.dataset.replayYear = String(f.ano)
  }
  const stop = (state: string) => {
    token++
    clearTimeout(timer)
    box.dataset.replayState = state
    play.textContent = say(state === 'done' ? 'replay.again' : 'replay.play')
  }
  /** Shows frame `i`; when `playing`, the next one follows after a step. A newer call cancels the waiting one. */
  const go = (i: number, playing: boolean) => {
    if (i < 0) return
    stop(playing ? 'playing' : 'paused')
    const mine = token
    index = i
    draw(i)
    if (!playing) return
    play.textContent = say('replay.pause')
    box.dataset.replayState = 'playing'
    timer = window.setTimeout(() => {
      if (mine !== token) return
      if (index + 1 < replay.frames.length) go(index + 1, true)
      else stop('done')
    }, STEP_MS)
  }
  play.addEventListener('click', () => {
    if (box.dataset.replayState === 'playing') stop('paused')
    else go(box.dataset.replayState === 'done' ? 0 : index, true)
  })

  panel.querySelector('.page__subtitle')?.after(box)
  draw(0)
  box.dataset.replayState = 'paused'
  box.dataset.replayYear = String(replay.frames[0]!.ano)
  document.documentElement.dataset.replay = 'ready'
  // Plays once when it comes into view, not before; a visitor who pauses or picks a cycle is never overridden.
  const seen = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return
    seen.disconnect()
    if (box.dataset.replayState === 'paused' && replay.frames.length > 1 && index === 0) go(0, true)
  })
  seen.observe(box)
  return {
    destroy() {
      seen.disconnect()
      stop('paused')
      box.remove()
    },
  }
}
