/**
 * Build time (Node) assembly of "Ficaram em casa" (#32): the dataset of `DATA_DIR` becomes the model of each cycle and round the dataset has.
 * Read once per build (the pages and the fragments share it). Everything else is pure (`stay-home.ts`, `stay-home-view.ts`).
 */
import { createStore } from '@/data/store'
import { diskSource } from '@/data/node'
import { dataDir } from './data-dir'
import { nonVotersExceedMargin, stayHomeRows, stayHomeViews, type StayHomeView } from './stay-home'
import { stayHomeModel, type StayHomeModel } from './stay-home-view'
import type { Register } from './sentences/catalog'

export interface StayHomeSet {
  views: StayHomeView[]
  /** The view the plain route shows: the newest cycle, round 1 (the Sketch frame). */
  defaultView: StayHomeView
  model(view: StayHomeView, register?: Register): StayHomeModel
  /** The rows behind a view, for the picture. */
  rows: (view: StayHomeView) => ReturnType<typeof stayHomeRows>
}

let memo: Promise<StayHomeSet> | undefined

export function loadStayHome(): Promise<StayHomeSet> {
  return (memo ??= (async () => {
    const store = createStore(diskSource(dataDir()))
    const [turnout, votes] = await Promise.all([store.turnout(), store.votes()])
    const views = stayHomeViews(turnout)
    const claims = new Map(views.map((v) => [`${v.ano}-${v.turno}`, nonVotersExceedMargin(turnout, votes, v.ano, v.turno)]))
    return {
      views,
      defaultView: views[0]!,
      rows: (view) => stayHomeRows(turnout, view.ano, view.turno),
      model: (view, register) => stayHomeModel({ view, views, rows: stayHomeRows(turnout, view.ano, view.turno), claim: claims.get(`${view.ano}-${view.turno}`), register }),
    }
  })())
}

/** Base-relative path of the page of a view; the newest cycle's round 1 is the plain address. */
export function stayHomePath(view: StayHomeView, defaultView: StayHomeView): string {
  const same = view.ano === defaultView.ano && view.turno === defaultView.turno
  return same ? '/mapa/ficaram-em-casa/' : `/mapa/ficaram-em-casa/${view.ano}-${view.turno}/`
}

export const stayHomeFragmentPath = (view: StayHomeView): string => `/fragmentos/mapa-por-estado/ficaram-em-casa/${view.ano}-${view.turno}/`
