import { useEffect, useMemo, useState } from 'react'
import { getAnalytics } from '@/analytics'
import PlacePicker, { type PickedPlace } from '@/components/PlacePicker'
import { ARROWS, CLUE_IDS, MAX_GUESSES, brazilDate, clueText, countdown, dailyIndex, dayNumber, feedback, gridRow, msToNext, outcome, regionName, shareText, unlockedClues, type Compare, type Feedback, type GameCity, type GameData } from '@/lib/game'
import { browserGameStorage, clearHistory, guessesOf, loadSave, withResult, writeSave, type GameSave } from '@/lib/game-store'
import { performShare, type ShareNavigator } from '@/lib/share-flow'
import { DEFAULT_VOICE, message, type MessageKey } from '@/lib/sentences/catalog'
import '@/lib/sentences/catalog-game'
import { withBase } from '@/paths'
import { useIslandReady } from '@/components/use-island-ready'

/**
 * "Adivinhe a cidade" (#69) and its end (#70): six guesses at a daily city, with clues that open one by one, the distance and direction from the municipality centres and
 * whether the secret city has more or less turnout and size. The game lives in the browser only: the data file is the one request, nothing about a guess is sent anywhere. The
 * city's name shows only at the end, the shared grid never carries it, and the only analytics event is the result being shared (no property).
 */
export interface GameProps {
  base: string
  origin: string
}

const say = (key: string, params: Record<string, string | number> = {}) => message(DEFAULT_VOICE, key as MessageKey, params)
const MARK: Record<Compare, string> = { more: '▲', less: '▼', equal: '=' }
const WORD: Record<Compare, string> = { more: 'game.more', less: 'game.less', equal: 'game.equal' }
const dateLabel = (key: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${key}T00:00:00Z`))
const idOf = (c: GameCity) => `${c[0]}/${c[1]}`

export default function Game({ base, origin }: GameProps) {
  const [data, setData] = useState<GameData>()
  const [failed, setFailed] = useState(false)
  const [day, setDay] = useState('')
  const [save, setSave] = useState<GameSave>({ day: '', guesses: [], history: [] })
  const [kept, setKept] = useState(true)
  const [pick, setPick] = useState<PickedPlace>()
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')
  const [left, setLeft] = useState(0)
  const island = useIslandReady('game')

  useEffect(() => {
    const today = brazilDate(new Date())
    setDay(today)
    setSave(loadSave())
    setKept(browserGameStorage() !== undefined)
    fetch(withBase(base, 'adivinhe/dados.json'))
      .then((res) => (res.ok ? (res.json() as Promise<GameData>) : Promise.reject(new Error(`game data: HTTP ${res.status}`))))
      .then(setData)
      .catch(() => setFailed(true))
  }, [base])

  const index = useMemo(() => new Map((data?.cities ?? []).map((c, i) => [idOf(c), i])), [data])
  const secret = data && day ? data.cities[dailyIndex(day, data.daily)] : undefined
  const guessIds = guessesOf(save, day)
  const guessed = guessIds.flatMap((id) => (index.has(id) ? [data!.cities[index.get(id)!]!] : []))
  const feedbacks: Feedback[] = secret ? guessed.map((g) => feedback(g, secret)) : []
  const result = outcome(feedbacks)
  const n = day ? dayNumber(day) + 1 : 0

  // data-ready (#122): no while the game's own file is on the way, yes once the daily city is on screen;
  // adivinhe/dados.json that cannot be read is the terminal failure.
  useEffect(() => {
    if (failed) return island.markFailed('adivinhe/dados.json')
    if (secret) island.markReady()
  }, [failed, !!secret, island.markReady, island.markFailed])

  // The countdown to the next city runs only after the game ends.
  useEffect(() => {
    if (!result.finished) return
    const tick = () => setLeft(msToNext(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [result.finished])

  // A finished game enters the history once.
  useEffect(() => {
    if (!result.finished || !day) return
    const next = withResult(save, { n, score: result.won ? result.guesses : 0 })
    if (next !== save) {
      setSave(next)
      setKept(writeSave(next))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.finished, result.won, n])

  const submit = () => {
    if (!pick || !data || !secret || result.finished) return
    const id = `${pick.uf}/${pick.slug}`
    if (!index.has(id)) return setNote(say('game.guess.unknown'))
    if (guessIds.includes(id)) return setNote(say('game.guess.again'))
    const next: GameSave = { ...save, day, guesses: [...guessIds, id] }
    setSave(next)
    setKept(writeSave(next))
    setPick(undefined)
    setNote('')
  }

  const url = `${origin}${base.endsWith('/') ? base : `${base}/`}adivinhe/`
  const text = shareText(n, feedbacks, url)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setStatus(say('game.share.copied'))
    getAnalytics().event('game_result_shared')
  }
  const share = () => {
    void performShare({ nav: navigator as ShareNavigator, file: undefined, text, download: copy })
      .then((r) => {
        if (r.status === 'shared') {
          setStatus('')
          getAnalytics().event('game_result_shared')
        }
        if (r.status === 'failed' && !r.fellBack) setStatus(say('game.share.copy.failed'))
      })
  }
  const clear = () => {
    setSave(clearHistory(save, n))
    setStatus(say('game.history.cleared'))
  }

  if (failed) return <p className="mt-4 text-step-2" role="status" data-status data-ready={island.dataReady} data-error={island.dataError}>{say('game.failed')}</p>
  if (!data || !day) return <p className="mt-4 text-step-2" role="status" data-status data-ready={island.dataReady}>{say('game.loading')}</p>
  if (!secret) return <p className="mt-4 text-step-2" role="status" data-status data-ready={island.dataReady}>{say('game.failed')}</p>

  const shown = unlockedClues(guessed.length)
  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => guessed[i])

  return (
    <div data-game data-n={n} data-finished={result.finished ? 'yes' : 'no'} data-ready={island.dataReady} className="mt-2 lg:grid lg:grid-cols-[1fr_620px] lg:gap-10">
      <div>
        <p className="text-step-1 text-muted-foreground" data-sub>{say('game.sub', { n, date: dateLabel(day) })}</p>
        <p className="mt-4 text-step-1 uppercase text-muted-foreground">{say('game.clues')}</p>
        <ol className="mt-1 grid gap-2" data-clues>
          {CLUE_IDS.map((id, i) => (
            <li key={id} className={`rounded-md border p-3 ${i < shown ? 'border-primary bg-background' : 'border-border bg-[var(--c-paper-2)] text-muted-foreground'}`} data-clue={id} data-unlocked={i < shown ? 'yes' : 'no'}>
              <p className="text-step-1 uppercase">{say('game.clue.n', { n: i + 1, kind: say(`game.clue.kind.${id}`) })}</p>
              <p className="mt-1 text-step-2 font-bold">{i < shown ? clueText(id, secret, data.states) : say('game.clue.locked', { n: i + 1 })}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-md border border-border bg-[var(--c-paper-2)] p-3 text-step-1" data-rules>{say('game.rules')}</p>
        <p className="mt-3 text-step-1 text-muted-foreground">{say('game.howto')}</p>
      </div>

      <div className="mt-4 min-w-0 lg:mt-0">
        <p className="text-step-1 uppercase text-muted-foreground">{say('game.guess')}</p>
        {!result.finished && (
          <div className="mt-1 flex items-end gap-2" data-guess-form>
            <div className="min-w-0 flex-1">
              <PlacePicker base={base} label={say('game.guess.picker')} value={pick} onPick={(p) => { setPick(p); setNote('') }} placeholder={say('game.guess.placeholder')} />
            </div>
            <button type="button" className="min-h-11 rounded-md bg-primary px-5 text-step-2 font-bold text-primary-foreground disabled:opacity-50" disabled={!pick} onClick={submit} data-send>
              {say('game.guess.send')}
            </button>
          </div>
        )}
        <p className="min-h-5 text-step-1 text-destructive" role="status" data-note>{note}</p>
        <p className="text-step-1 font-bold" data-attempt>{say('game.attempt', { n: Math.min(guessed.length + (result.finished ? 0 : 1), MAX_GUESSES) })}</p>
        <table className="mt-1 w-full border-collapse text-step-1" data-guesses>
          <thead>
            <tr className="border-b border-foreground text-left text-step-1 uppercase text-muted-foreground">
              <th className="py-1 pr-2">{say('game.col.city')}</th>
              <th className="py-1 pr-2">{say('game.col.distance')}</th>
              <th className="py-1 pr-2">{say('game.col.turnout')}</th>
              <th className="py-1">{say('game.col.size')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g, i) => {
              const f = feedbacks[i]
              return (
                <tr key={i} className="border-b border-border" data-row={i + 1} data-correct={f?.correct ? 'yes' : 'no'}>
                  <td className="py-2 pr-2 text-step-1">{g ? `${i + 1}  ${g[2]} · ${g[0].toUpperCase()}` : <span className="text-muted-foreground">{i + 1}</span>}</td>
                  <td className="whitespace-nowrap py-2 pr-2 text-primary" data-distance>{f ? (f.correct ? '0 km' : `${new Intl.NumberFormat('pt-BR').format(f.km)} km ${ARROWS[f.dir]}`) : ''}</td>
                  <td className="whitespace-nowrap py-2 pr-2" data-turnout>{f ? `${MARK[f.turnout]} ${say(WORD[f.turnout])}` : ''}</td>
                  <td className="whitespace-nowrap py-2" data-size>{f ? `${MARK[f.size]} ${say(WORD[f.size])}` : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {result.finished && (
          <div className="mt-4 rounded-md border border-border bg-[var(--c-paper-2)] p-3" data-end>
            <p className="font-serif text-step-3" data-answer>
              {result.won ? say('game.won', { n: result.guesses, city: `${secret[2]} · ${secret[0].toUpperCase()}` }) : say('game.lost', { city: `${secret[2]} · ${secret[0].toUpperCase()}` })}
            </p>
            <p className="mt-3 text-step-1 uppercase text-muted-foreground">{say('game.share.title')}</p>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-step-2" data-grid>{shareText(n, feedbacks, '').trimEnd()}</pre>
            <p className="text-step-1 text-muted-foreground">{say('game.share.legend')}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="min-h-11 flex-1 rounded-md bg-primary px-4 text-step-2 font-bold text-primary-foreground" onClick={share} data-share>{say('game.share.button')}</button>
              <button type="button" className="min-h-11 flex-1 rounded-md border border-border bg-background px-4 text-step-2 font-bold" onClick={() => void copy().catch(() => setStatus(say('game.share.copy.failed')))} data-copy>{say('game.share.copy')}</button>
            </div>
            <p className="min-h-5 text-step-1 text-muted-foreground" role="status" aria-live="polite" data-share-status>{status}</p>
            <p className="text-step-1 text-muted-foreground">{say('game.share.note')}</p>
            <p className="mt-2 text-step-2 font-bold" data-countdown>{say('game.next', { time: countdown(left) })}</p>
          </div>
        )}

        <div className="mt-4" data-history>
          <p className="text-step-1 uppercase text-muted-foreground">{say('game.history.title')}</p>
          {save.history.length === 0 ? (
            <p className="text-step-1" data-history-empty>{say('game.history.empty')}</p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-x-4 text-step-1">
              {[...save.history].reverse().map((h) => (
                <li key={h.n} data-history-row>{say('game.history.row', { n: h.n, score: h.score ? say('game.history.won', { n: h.score }) : say('game.history.lost') })}</li>
              ))}
            </ul>
          )}
          <p className="text-step-1 text-muted-foreground">{say('game.history.note')}</p>
          {!kept && <p className="text-step-1 text-muted-foreground" data-blocked>{say('game.storage.blocked')}</p>}
          {save.history.length > 0 && <button type="button" className="mt-1 min-h-11 rounded-md border border-border bg-background px-4 text-step-1 font-bold" onClick={clear} data-clear>{say('game.history.clear')}</button>}
        </div>
        <p className="mt-2 text-step-1 text-muted-foreground" hidden data-region={regionName(secret[8])} />
      </div>
    </div>
  )
}
