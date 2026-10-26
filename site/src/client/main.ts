import { getAnalytics } from '../analytics'
import { resolveRoute } from '../app'
import { createBrowserStore } from '../data/browser'
import { normalizeBase, stripBase } from '../paths'
import { slots } from '../slots/registry'
import { html } from '../shared/html'
import { pageFrame } from '../shared/page-frame'
import { makeHref, type SlotContext } from '../shared/slot'
import { notFoundPage } from '../not-found'

/**
 * Browser entry. Pages are pre-rendered; this script (1) re-renders when the page was served by the
 * 404.html fallback or ?fixture=sketch asks for the frame fixture, and (2) mounts the slot.
 */
async function main() {
  const base = normalizeBase(document.documentElement.dataset.base)
  const app = document.getElementById('app')!
  const data = createBrowserStore(base)
  const path = stripBase(base, location.pathname)
  const query = new URLSearchParams(location.search)
  const resolved = await resolveRoute(path, slots, data)

  if (!resolved) {
    app.dataset.slot = 'not-found'
    app.innerHTML = notFoundPage(base).html.value
    document.title = `${notFoundPage(base).title} · Voto a Voto`
    getAnalytics().pageView(path, 'not-found')
    document.documentElement.dataset.ready = '1'
    return
  }

  const ctx: SlotContext = {
    base,
    params: resolved.params,
    query,
    data,
    analytics: getAnalytics(),
    useFrameFixture: query.get('fixture') === 'sketch',
    href: makeHref(base, resolved.params),
  }
  const stale = app.dataset.slot !== resolved.slot.meta.id || ctx.useFrameFixture
  let title = document.title
  if (stale) {
    const page = await resolved.slot.render(ctx)
    app.innerHTML = page.html.value
    app.dataset.slot = resolved.slot.meta.id
    title = `${page.title} · Voto a Voto`
    document.title = title
  }
  await resolved.slot.mount?.(app, ctx)
  ctx.analytics.pageView(path, title)
  document.documentElement.dataset.ready = '1'
}

main().catch((err) => {
  console.error(err)
  const app = document.getElementById('app')
  if (app && !app.dataset.slot) app.innerHTML = pageFrame({ base: '/', title: 'Erro', children: html`<p>Não foi possível carregar a página.</p>` }).value
  document.documentElement.dataset.ready = 'error'
})
