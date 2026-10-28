import { int, pct1 } from './format'
import { UF_NOME } from '../uf-names'
import { displayName } from '@/shared/city-search'

/**
 * The enhancer of the Tabela de detalhe (#76): it takes the server-rendered table (complete without scripts) and adds, in place, a name filter, sorting by any column, paging, rows
 * that open into the places of the next level (▸/▾, children indented, fetched from the shard of that place) and the CSV. It works on the DOM it is given, so jsdom tests drive it.
 *
 * Async rules (this suite has had ordering bugs): opening a row is the only async step; every open/close bumps the row's token and a result is applied only if the token is still
 * the one that asked and the row is still open - the latest request wins. `data-ready` says the enhancer is attached; `data-busy` counts requests in flight; each row says
 * `data-state` = closed | loading | open | failed, which tests wait on.
 */
export const PAGE_SIZE = 25

export interface EnhanceOptions {
  /** Base URL of the shipped shards, ending in a slash: `<base>data/v<fp>/nerds/`. */
  shardsUrl: string
  /** The site base ("/" or "/voto-a-voto-oss/"), for the links of the rows it adds. */
  base: string
  fetch?: typeof fetch
  pageSize?: number
  /** Provenance of the CSV header block. */
  provenance: Provenance
}

export interface Provenance {
  source: string
  edition: string
  date: string
  calculo: string
  licence: string
}

interface RawShard {
  columns: string[]
  ufs?: unknown[][]
  municipios?: unknown[][]
  regiao?: string
}

const norm = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const METRIC_AT = { eleitorado: 0, comparecimento: 1, abstencao: 2, brancos_nulos: 3, validos: 4, nao_instalados: 5 } as const

/** The same printed cells the server writes (format.ts is the one source of the number formats): eleitorado, then the three rates for turno 1 and 2. */
function cellsOf(rows: (number[] | undefined)[]): { text: (string | null)[]; v: (number | null)[] } {
  const [t1, t2] = rows
  const first = t1 ?? t2
  const text: (string | null)[] = [first ? int(first[METRIC_AT.eleitorado]!) : null]
  const v: (number | null)[] = [first ? first[METRIC_AT.eleitorado]! : null]
  for (const [part, whole] of [[METRIC_AT.comparecimento, METRIC_AT.eleitorado], [METRIC_AT.abstencao, METRIC_AT.eleitorado], [METRIC_AT.brancos_nulos, METRIC_AT.comparecimento]] as const) {
    for (const r of [t1, t2]) {
      const t = r ? pct1(r[part]!, r[whole]!) : null
      text.push(t)
      v.push(t === null ? null : Number(t.replace('%', '').replace(',', '.')))
    }
  }
  return { text, v }
}

export interface Enhanced {
  /** The CSV as it would be downloaded: the provenance block, then the rows as printed. */
  csv(): string
  /** Detach: removes what it added and restores the server-rendered table. */
  destroy(): void
}

export function enhanceTable(root: HTMLElement, options: EnhanceOptions): Enhanced {
  const table = root.querySelector<HTMLTableElement>('table[data-table]')!
  const tbody = table.tBodies[0]!
  const doc = root.ownerDocument
  const fetcher = options.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a))
  const pageSize = options.pageSize ?? PAGE_SIZE
  const ano = Number(table.dataset.ano)
  const unit = table.dataset.unit ?? 'lugares'

  const total = tbody.querySelector<HTMLTableRowElement>('tr[data-total]')
  const tops = [...tbody.querySelectorAll<HTMLTableRowElement>('tr[data-row]:not([data-total])')]
  const state = { sort: null as { col: number; dir: 'asc' | 'desc' } | null, filter: '', page: 0 }
  let busy = 0
  const cleanup: (() => void)[] = []

  // --- controls ---
  const bar = doc.createElement('div')
  bar.className = 'nerds-tools'
  bar.innerHTML = `<label>Filtrar por nome <input type="search" data-filter autocomplete="off"></label><span class="nerds-count" data-count role="status" aria-live="polite"></span><button type="button" class="nerds-link" data-csv>Baixar CSV</button>`
  root.insertBefore(bar, root.firstChild)
  const pager = doc.createElement('div')
  pager.className = 'nerds-pager'
  pager.innerHTML = `<button type="button" data-prev>‹ Anteriores</button><span data-page-label></span><button type="button" data-next>Próximos ›</button>`
  root.appendChild(pager)
  const input = bar.querySelector<HTMLInputElement>('[data-filter]')!
  const count = bar.querySelector<HTMLElement>('[data-count]')!

  // --- sort headers become buttons ---
  const heads = [...table.tHead!.rows[0]!.cells]
  const headOriginal = heads.map((th) => th.innerHTML)
  heads.forEach((th, col) => {
    const label = th.textContent ?? ''
    th.innerHTML = `<button type="button" class="nerds-sort" data-sort="${col}">${label}</button>`
  })

  // --- open buttons (▸/▾) on rows that have a place below ---
  for (const row of tops) {
    if (!row.dataset.openLevel) continue
    row.dataset.state = 'closed'
    const name = row.cells[0]!
    const button = doc.createElement('button')
    button.type = 'button'
    button.className = 'nerds-open'
    button.dataset.open = ''
    button.setAttribute('aria-expanded', 'false')
    button.setAttribute('aria-label', `Abrir ${row.dataset.openLevel === 'uf' ? 'os municípios de' : 'os estados de'} ${name.dataset.name}`)
    button.textContent = '▸'
    name.insertBefore(button, name.firstChild)
  }

  const childrenOf = (row: HTMLTableRowElement) => [...tbody.querySelectorAll<HTMLTableRowElement>(`tr[data-child-of="${row.dataset.row}"]`)]

  function rowsInView(): HTMLTableRowElement[] {
    const wanted = norm(state.filter.trim())
    let list = tops.filter((r) => !wanted || norm(r.cells[0]!.dataset.name ?? '').includes(wanted))
    if (state.sort) {
      const { col, dir } = state.sort
      const sign = dir === 'asc' ? 1 : -1
      const original = new Map(tops.map((r, i) => [r, i]))
      const value = (r: HTMLTableRowElement): string | number | null => {
        if (col === 0) return norm(r.cells[0]!.dataset.name ?? '')
        const v = r.cells[col]?.dataset.v
        return v === undefined ? null : Number(v)
      }
      list = [...list].sort((a, b) => {
        const [x, y] = [value(a), value(b)]
        if (x === null && y === null) return original.get(a)! - original.get(b)!
        if (x === null) return 1
        if (y === null) return -1
        return x === y ? original.get(a)! - original.get(b)! : (x < y ? -1 : 1) * sign
      })
    }
    return list
  }

  function render() {
    const list = rowsInView()
    const pages = Math.max(1, Math.ceil(list.length / pageSize))
    state.page = Math.min(state.page, pages - 1)
    const slice = new Set(list.slice(state.page * pageSize, (state.page + 1) * pageSize))
    const ordered: HTMLTableRowElement[] = []
    for (const row of list) ordered.push(row, ...childrenOf(row))
    for (const row of tops) if (!list.includes(row)) for (const r of [row, ...childrenOf(row)]) r.hidden = true
    for (const row of list) {
      const show = slice.has(row)
      row.hidden = !show
      for (const c of childrenOf(row)) c.hidden = !show
    }
    for (const row of ordered) tbody.appendChild(row)
    if (total) tbody.appendChild(total)
    count.textContent = list.length === tops.length ? `Mostrando ${Math.min(pageSize, list.length)} de ${tops.length} ${unit}` : `${list.length} de ${tops.length} ${unit} com esse nome`
    pager.hidden = pages === 1
    pager.querySelector<HTMLElement>('[data-page-label]')!.textContent = `Página ${state.page + 1} de ${pages}`
    pager.querySelector<HTMLButtonElement>('[data-prev]')!.disabled = state.page === 0
    pager.querySelector<HTMLButtonElement>('[data-next]')!.disabled = state.page >= pages - 1
    heads.forEach((th, col) => {
      if (state.sort?.col === col) th.setAttribute('aria-sort', state.sort.dir === 'asc' ? 'ascending' : 'descending')
      else th.removeAttribute('aria-sort')
    })
    table.dataset.page = String(state.page + 1)
  }

  // --- opening a row ---
  const tokens = new Map<HTMLTableRowElement, number>()
  async function shard(level: string, id: string, turno: number): Promise<RawShard | undefined> {
    try {
      const res = await fetcher(`${options.shardsUrl}${level}/${id}/${ano}-${turno}.json`)
      if (!res.ok) return undefined
      return (await res.json()) as RawShard
    } catch {
      return undefined
    }
  }


  async function open(row: HTMLTableRowElement) {
    const token = (tokens.get(row) ?? 0) + 1
    tokens.set(row, token)
    const level = row.dataset.openLevel!
    const id = row.dataset.openId!
    const button = row.querySelector<HTMLButtonElement>('button[data-open]')!
    row.dataset.state = 'loading'
    button.setAttribute('aria-expanded', 'true')
    button.textContent = '▾'
    busy += 1
    table.dataset.busy = String(busy)
    const found = await Promise.all([1, 2].map((t) => shard(level, id, t)))
    busy -= 1
    table.dataset.busy = String(busy)
    // The latest request wins: a result for a row that was closed (or re-asked) meanwhile is dropped.
    if (tokens.get(row) !== token || row.dataset.state !== 'loading') return
    if (!found[0] && !found[1]) {
      row.dataset.state = 'failed'
      const note = doc.createElement('tr')
      note.dataset.childOf = row.dataset.row
      note.dataset.note = ''
      note.innerHTML = `<td colspan="${row.cells.length}" class="nerds-none">Não foi possível abrir agora. Use o link do nome para abrir a página.</td>`
      row.after(note)
      return
    }
    const kind = level === 'regiao' ? 'uf' : 'municipio'
    const lists = found.map((s) => (s ? ((kind === 'uf' ? s.ufs : s.municipios) ?? []).map((cells) => ({ cells, columns: s.columns })) : []))
    const ids = new Map<string, { cells: unknown[]; columns: string[] }[]>()
    lists.forEach((list, t) => {
      for (const item of list) {
        const key = String(item.cells[0])
        const slot = ids.get(key) ?? [undefined, undefined]
        slot[t] = item as never
        ids.set(key, slot as never)
      }
    })
    const numbers = (item: { cells: unknown[]; columns: string[] } | undefined): number[] | undefined => item && (item.cells.slice(item.columns.indexOf('eleitorado'), item.columns.indexOf('eleitorado') + 6) as number[])
    const made: HTMLTableRowElement[] = []
    const entries = [...ids.entries()].map(([key, pair]) => {
      const first = (pair as unknown as ({ cells: unknown[]; columns: string[] } | undefined)[]).find(Boolean)!
      const nome = kind === 'uf' ? UF_NOME[key] ?? key.toUpperCase() : displayName(String(first.cells[first.columns.indexOf('nome')] ?? key))
      return { key, nome, pair: pair as unknown as ({ cells: unknown[]; columns: string[] } | undefined)[] }
    })
    entries.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    for (const e of entries) {
      const { text, v } = cellsOf([numbers(e.pair[0]), numbers(e.pair[1])])
      const tr = doc.createElement('tr')
      tr.dataset.row = `${row.dataset.row}/${e.key}`
      tr.dataset.childOf = row.dataset.row
      const href = kind === 'uf' ? `${options.base}dados-para-nerds/estado/${e.key}/` : `${options.base}${id}/${e.key}/`
      const th = doc.createElement('th')
      th.scope = 'row'
      th.className = 'nerds-child'
      th.dataset.name = e.nome
      th.innerHTML = `<a href="${href}"></a>`
      th.querySelector('a')!.textContent = e.nome
      tr.appendChild(th)
      text.forEach((cell, i) => {
        const td = doc.createElement('td')
        td.className = 'is-num'
        if (v[i] !== null && v[i] !== undefined) td.dataset.v = String(v[i])
        if (cell === null) td.innerHTML = '<span class="nerds-none">sem 2º turno</span>'
        else td.textContent = cell
        tr.appendChild(td)
      })
      made.push(tr)
    }
    let anchor: HTMLTableRowElement = row
    for (const tr of made) {
      tr.hidden = row.hidden
      anchor.after(tr)
      anchor = tr
    }
    row.dataset.state = 'open'
  }

  function close(row: HTMLTableRowElement) {
    tokens.set(row, (tokens.get(row) ?? 0) + 1)
    for (const c of childrenOf(row)) c.remove()
    row.dataset.state = 'closed'
    const button = row.querySelector<HTMLButtonElement>('button[data-open]')
    button?.setAttribute('aria-expanded', 'false')
    if (button) button.textContent = '▸'
  }

  // --- csv: the provenance block, then the rows exactly as printed (the visible top-level rows of the current order and the total) ---
  function csv(): string {
    const p = options.provenance
    const q = (cell: string) => (/[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)
    const lines = [`# Fonte: ${p.source}`, `# Edição: ${p.edition}`, `# Data: ${p.date}`, `# Cálculo: ${p.calculo}`, `# Licença: ${p.licence}`]
    const head = [...table.tHead!.rows[0]!.cells].map((th, i) => th.dataset.label || headOriginal[i]!.replace(/<[^>]+>/g, '') || th.textContent || '')
    lines.push(head.map(q).join(';'))
    const printed = (r: HTMLTableRowElement) => [...r.cells].map((c) => (c.dataset.name ?? (c.textContent ?? '')).trim()).map(q).join(';')
    for (const r of rowsInView()) lines.push(printed(r))
    if (total) lines.push(printed(total))
    return `${lines.join('\n')}\n`
  }

  // --- events ---
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    el.addEventListener(type, fn)
    cleanup.push(() => el.removeEventListener(type, fn))
  }
  on(input, 'input', () => {
    state.filter = input.value
    state.page = 0
    render()
  })
  on(table, 'click', (e) => {
    const target = e.target as HTMLElement
    const sort = target.closest<HTMLElement>('[data-sort]')
    if (sort) {
      const col = Number(sort.dataset.sort)
      state.sort = state.sort?.col === col && state.sort.dir === 'asc' ? { col, dir: 'desc' } : { col, dir: 'asc' }
      state.page = 0
      render()
      return
    }
    const opener = target.closest<HTMLElement>('[data-open]')
    if (opener) {
      const row = opener.closest<HTMLTableRowElement>('tr')!
      if (row.dataset.state === 'closed' || row.dataset.state === 'failed') {
        if (row.dataset.state === 'failed') close(row)
        void open(row)
      } else close(row)
    }
  })
  on(pager, 'click', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-prev]')) state.page = Math.max(0, state.page - 1)
    else if (target.closest('[data-next]')) state.page += 1
    else return
    render()
  })
  on(bar, 'click', (e) => {
    if (!(e.target as HTMLElement).closest('[data-csv]')) return
    const blob = new Blob([`﻿${csv()}`], { type: 'text/csv;charset=utf-8' })
    const a = doc.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${unit.replace(/\s+/g, '-')}-${ano}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  })

  render()
  root.dataset.ready = 'yes'

  return {
    csv,
    destroy() {
      for (const fn of cleanup) fn()
      bar.remove()
      pager.remove()
      heads.forEach((th, i) => (th.innerHTML = headOriginal[i]!))
      for (const row of tbody.querySelectorAll<HTMLTableRowElement>('tr[data-child-of]')) row.remove()
      for (const button of tbody.querySelectorAll('button[data-open]')) button.remove()
      for (const row of tops) row.hidden = false
      delete root.dataset.ready
    },
  }
}

