// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enhanceTable, type Enhanced } from './table-enhance'

const provenance = { source: 'TSE, edição 26/10/2026', edition: '2026-10-26', date: '2026-10-26', calculo: 'Votantes ÷ eleitorado.', licence: 'CC BY 4.0' }
const row = (id: string, name: string, v: (number | null)[], open?: string) =>
  `<tr data-row="${id}" ${open ? `data-open-level="regiao" data-open-id="${open}"` : ''}><th scope="row" data-name="${name}"><a href="/x/${id}/">${name}</a></th>${v
    .map((n) => `<td class="is-num" ${n === null ? '' : `data-v="${n}"`}>${n === null ? '<span class="nerds-none">sem 2º turno</span>' : n}</td>`)
    .join('')}</tr>`
const html = `<div class="nerds-tablewrap"><table data-table data-ano="2022" data-unit="municípios"><thead><tr><th scope="col">Nome</th><th scope="col">Eleitorado</th><th scope="col">Comparecimento 2º turno</th></tr></thead><tbody>
${row('a', 'Água Boa', [100, 80])}${row('b', 'Belém', [300, null])}${row('c', 'Cuiabá', [200, 90])}${row('d', 'Dourados', [50, null])}${row('e', 'Ebano', [400, 70], 'sudeste')}
<tr data-row="total" data-total><th scope="row" data-name="Brasil">Brasil</th><td data-v="1050">1050</td><td data-v="80">80</td></tr></tbody></table></div>`

let root: HTMLElement
let enhanced: Enhanced | undefined
const names = () => [...root.querySelectorAll<HTMLElement>('tbody tr:not([hidden]) th[scope="row"]')].map((th) => th.dataset.name)
const shardBody = (rows: unknown[][]) => ({ columns: ['id', 'nome', 'eleitorado', 'comparecimento', 'abstencao', 'brancos_nulos', 'validos', 'nao_instalados', 'votos'], ufs: rows, municipios: rows })
const cells = (id: string, n: number) => [id, id.toUpperCase(), n, n * 0.8, n * 0.2, 1, 2, 0, 5, 6]

beforeEach(() => {
  document.body.innerHTML = html
  root = document.querySelector<HTMLElement>('.nerds-tablewrap')!
})
afterEach(() => {
  enhanced?.destroy()
  enhanced = undefined
})
const attach = (extra: Partial<Parameters<typeof enhanceTable>[1]> = {}) => (enhanced = enhanceTable(root, { shardsUrl: '/data/v1/nerds/', base: '/', provenance, ...extra }))

describe('Tabela de detalhe enhancer', () => {
  it('filters by name without regard to accents or case, and the total row stays', () => {
    attach()
    const input = root.querySelector<HTMLInputElement>('[data-filter]')!
    input.value = 'agua'
    input.dispatchEvent(new Event('input'))
    expect(names()).toEqual(['Água Boa', 'Brasil'])
    expect(root.querySelector('[data-count]')!.textContent).toBe('1 de 5 municípios com esse nome')
  })

  it('sorts by any column, stable, with "sem 2º turno" last in either direction; the default order is the one rendered', () => {
    attach()
    expect(names()).toEqual(['Água Boa', 'Belém', 'Cuiabá', 'Dourados', 'Ebano', 'Brasil'])
    const sort = (col: number) => root.querySelector<HTMLElement>(`[data-sort="${col}"]`)!.click()
    sort(2)
    expect(names()).toEqual(['Ebano', 'Água Boa', 'Cuiabá', 'Belém', 'Dourados', 'Brasil'])
    sort(2)
    expect(names()).toEqual(['Cuiabá', 'Água Boa', 'Ebano', 'Belém', 'Dourados', 'Brasil'])
    sort(1)
    expect(names().slice(0, 5)).toEqual(['Dourados', 'Água Boa', 'Cuiabá', 'Belém', 'Ebano'])
    expect(root.querySelector('th[aria-sort="ascending"]')!.textContent).toBe('Eleitorado')
  })

  it('pages the rows and keeps the total on the last row of every page', () => {
    attach({ pageSize: 2 })
    expect(names()).toEqual(['Água Boa', 'Belém', 'Brasil'])
    root.querySelector<HTMLElement>('[data-next]')!.click()
    expect(names()).toEqual(['Cuiabá', 'Dourados', 'Brasil'])
    root.querySelector<HTMLElement>('[data-next]')!.click()
    root.querySelector<HTMLElement>('[data-next]')!.click()
    expect(names()).toEqual(['Ebano', 'Brasil'])
    expect(root.querySelector<HTMLButtonElement>('[data-next]')!.disabled).toBe(true)
    expect(root.querySelector('[data-page-label]')!.textContent).toBe('Página 3 de 3')
  })

  it('writes a CSV that starts with the provenance block and then the rows as printed', () => {
    const csv = attach().csv()
    const lines = csv.split('\n')
    expect(lines.slice(0, 5)).toEqual(['# Fonte: TSE, edição 26/10/2026', '# Edição: 2026-10-26', '# Data: 2026-10-26', '# Cálculo: Votantes ÷ eleitorado.', '# Licença: CC BY 4.0'])
    expect(lines[5]).toBe('Nome;Eleitorado;Comparecimento 2º turno')
    expect(lines[6]).toBe('Água Boa;100;80')
    expect(lines[7]).toBe('Belém;300;sem 2º turno')
    expect(lines.at(-2)).toBe('Brasil;1050;80')
  })

  describe('opening a row', () => {
    const open = () => root.querySelector<HTMLElement>('tr[data-row="e"] [data-open]')!
    const state = () => root.querySelector<HTMLElement>('tr[data-row="e"]')!.dataset.state
    const ok = (rows: unknown[][]) => ({ ok: true, json: async () => shardBody(rows) }) as Response

    it('inserts the children indented under the row, from the shard of that place for both turnos, and closes again', async () => {
      const fetcher = vi.fn(async (url: string) => (url.endsWith('2022-1.json') ? ok([cells('rj', 10), cells('sp', 30)]) : ok([cells('rj', 11)])))
      attach({ fetch: fetcher as never })
      open().click()
      expect(state()).toBe('loading')
      await vi.waitFor(() => expect(state()).toBe('open'))
      expect(fetcher.mock.calls.map((c) => c[0]).sort()).toEqual(['/data/v1/nerds/regiao/sudeste/2022-1.json', '/data/v1/nerds/regiao/sudeste/2022-2.json'])
      const kids = [...root.querySelectorAll('tr[data-child-of="e"]')]
      expect(kids.map((k) => (k.querySelector('th') as HTMLElement).dataset.name)).toEqual(['Rio de Janeiro', 'São Paulo'].map((n) => (n === 'Rio de Janeiro' ? 'Rio de Janeiro' : 'São Paulo')))
      expect(kids[0]!.querySelector('th')!.classList.contains('nerds-child')).toBe(true)
      expect(kids[1]!.textContent).toContain('sem 2º turno')
      expect(open().getAttribute('aria-expanded')).toBe('true')
      open().click()
      expect(state()).toBe('closed')
      expect(root.querySelectorAll('tr[data-child-of]')).toHaveLength(0)
    })

    it('lets only the latest request win: closing while a request is in flight drops its result, and open-close-open applies exactly one set', async () => {
      const waiting: ((r: Response) => void)[] = []
      const fetcher = vi.fn(() => new Promise<Response>((resolve) => waiting.push(resolve)))
      attach({ fetch: fetcher as never })
      open().click() // request A (2 fetches)
      open().click() // closed before A answers
      open().click() // request B (2 more fetches)
      expect(waiting).toHaveLength(4)
      waiting[2]!(ok([cells('rj', 1)]))
      waiting[3]!(ok([cells('rj', 1)]))
      await vi.waitFor(() => expect(state()).toBe('open'))
      waiting[0]!(ok([cells('zz', 9), cells('yy', 9)])) // the stale answers arrive last
      waiting[1]!(ok([cells('zz', 9)]))
      await new Promise((r) => setTimeout(r, 10))
      expect([...root.querySelectorAll('tr[data-child-of="e"] th')].map((t) => (t as HTMLElement).dataset.name)).toEqual(['Rio de Janeiro'])
      expect(root.querySelector('table')!.dataset.busy).toBe('0')
    })

    it('says so and keeps the link of the name when the shard cannot be read', async () => {
      attach({ fetch: (async () => ({ ok: false }) as Response) as never })
      open().click()
      await vi.waitFor(() => expect(state()).toBe('failed'))
      expect(root.querySelector('tr[data-note]')!.textContent).toContain('Não foi possível abrir')
      expect(root.querySelector('tr[data-row="e"] a')!.getAttribute('href')).toBe('/x/e/')
    })
  })

  it('restores the server-rendered table when destroyed', () => {
    attach().destroy()
    enhanced = undefined
    expect(root.querySelector('[data-filter]')).toBeNull()
    expect(root.querySelector('thead th')!.innerHTML).toBe('Nome')
    expect(names()).toEqual(['Água Boa', 'Belém', 'Cuiabá', 'Dourados', 'Ebano', 'Brasil'])
  })
})
