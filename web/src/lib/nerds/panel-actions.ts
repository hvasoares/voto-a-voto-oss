import { CITE_FORMATS, citation, csvText, permalink, provenanceLines, type CiteFormat, type EditionInfo, type ExportTable, type Panel } from './actions'
import type { PanelExport } from './export-spec'
import { panelCardSvg } from './panel-card'
import { parseQuery, type NerdsState } from './url-state'

/**
 * The actions of every panel header (#80): Citar (one dialog, three formats), CSV and Imagem, as real text buttons, keyboard accessible, added in place by one small island
 * (client:panel). Each reads what the panel prints: the title and the four footer fields from its own markup, the table from its export block (or, for the Tabela de detalhe, from the
 * table itself). Nothing is sent anywhere; no analytics property is added.
 */
export interface ActionsConfig {
  origin: string
  base: string
  /** `dados-para-nerds/estado/sp/` */
  path: string
  edition: EditionInfo
  editionId: string
  place: string
  cycles: number[]
  siteUrl: string
  /** The rasteriser of the picture (svgToPng + saveBlob in the browser; a stub in tests). */
  saveImage?: (svg: string, filename: string) => Promise<void>
  saveText?: (text: string, filename: string, type: string) => void
  copy?: (text: string) => Promise<void>
}

const text = (el: Element | null) => (el?.textContent ?? '').trim()

function panelOf(section: HTMLElement): Panel {
  const field = (name: string) => text(section.querySelector(`[data-field="${name}"]`))
  const h2 = section.querySelector('h2')!.cloneNode(true) as HTMLElement
  h2.querySelectorAll('[data-unchecked]').forEach((n) => n.remove())
  return { id: section.dataset.panel!, title: text(h2), footer: { definicao: field('definicao'), fonte: field('fonte'), calculo: field('calculo'), naoMede: field('naoMede') } }
}

/** The panel's state for its address: the cycle of its block (or the address's), the turno and measure it shows now. */
export function stateOf(section: HTMLElement, search: string, cycles: number[]): NerdsState {
  const { state } = parseQuery(search, cycles)
  const block = section.closest<HTMLElement>('[data-ciclo-block]')
  if (block) state.ciclo = Number(block.dataset.cicloBlock)
  const drawn = section.dataset.drawn ?? ''
  const map = /^(\d{4})-([12])-(\w+)$/.exec(drawn)
  if (map) Object.assign(state, { ciclo: Number(map[1]), turno: Number(map[2]), medida: map[3] })
  const dist = section.querySelector<HTMLElement>('[data-dist]')
  if (dist) Object.assign(state, { turno: Number(dist.dataset.turno), medida: dist.dataset.measure })
  const escada = section.querySelector<HTMLElement>('[data-escada]')
  if (escada?.dataset.measure) state.medida = escada.dataset.measure
  return state
}

function tableOf(section: HTMLElement): ExportTable {
  const live = section.querySelector<HTMLTableElement>('table[data-table]')
  if (live) {
    const headers = [...live.tHead!.rows[0]!.cells].map((th) => th.dataset.label || text(th))
    const rows = [...live.tBodies[0]!.rows].filter((r) => !r.dataset.childOf).map((r) => [...r.cells].map((c) => (c.dataset.name ?? text(c)).replace(/^[▸▾]\s*/, '')))
    return { headers, rows }
  }
  const raw = section.querySelector('script[data-export]')?.textContent
  const exp = (raw ? JSON.parse(raw) : {}) as PanelExport
  if (exp.single) return exp.single
  const drawn = section.dataset.drawn
  const dist = section.querySelector<HTMLElement>('[data-dist]')
  const key = dist ? `${dist.dataset.turno}-${dist.dataset.measure}` : drawn
  const variant = key ? exp.variants?.[key] : undefined
  if (variant) return variant
  return { headers: [], rows: [] }
}

export function mountActions(root: HTMLElement, cfg: ActionsConfig): { destroy(): void } {
  const doc = root.ownerDocument
  const cleanup: (() => void)[] = []
  const saveText = cfg.saveText ?? ((body, filename, type) => {
    const url = URL.createObjectURL(new Blob([body], { type }))
    const a = doc.createElement('a')
    a.href = url
    a.download = filename
    a.hidden = true
    doc.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  })
  const copy = cfg.copy ?? (async (t: string) => navigator.clipboard.writeText(t))

  for (const section of root.querySelectorAll<HTMLElement>('section.nerds-panel[data-panel]')) {
    const slot = section.querySelector<HTMLElement>('[data-panel-actions]')
    if (!slot || slot.dataset.mounted) continue
    slot.dataset.mounted = '1'
    const fonteOf = (p: Panel) => p.footer.fonte
    const facts = () => {
      const panel = panelOf(section)
      const state = stateOf(section, doc.defaultView!.location.search, cfg.cycles)
      const url = permalink(cfg.origin, cfg.base, cfg.path, state, panel.id)
      return { panel, state, url }
    }
    const button = (label: string, name: string, onClick: () => void) => {
      const b = doc.createElement('button')
      b.type = 'button'
      b.className = 'nerds-action'
      b.dataset.action = name
      b.textContent = label
      b.addEventListener('click', onClick)
      slot.append(b)
    }
    button('Citar', 'citar', () => openCite(doc, cfg, facts(), slot.querySelector<HTMLElement>('[data-action="citar"]')!, copy))
    button('CSV', 'csv', () => {
      const { panel, state, url } = facts()
      const block = provenanceLines({ panel, edition: cfg.edition, editionId: cfg.editionId, place: cfg.place, url, fonte: fonteOf(panel) })
      saveText(`﻿${csvText(block, tableOf(section))}`, `${panel.id}-${cfg.path.split('/').filter(Boolean).slice(-1)[0]}-${state.ciclo}.csv`, 'text/csv;charset=utf-8')
    })
    button('Imagem', 'imagem', () => {
      const { panel, state, url } = facts()
      const svg = panelCardSvg({ panel, table: tableOf(section), place: cfg.place, fonte: fonteOf(panel), url })
      void cfg.saveImage?.(svg, `${panel.id}-${cfg.path.split('/').filter(Boolean).slice(-1)[0]}-${state.ciclo}.png`)
    })
  }
  root.dataset.actionsReady = 'yes'
  return {
    destroy() {
      for (const fn of cleanup) fn()
      for (const slot of root.querySelectorAll<HTMLElement>('[data-panel-actions]')) {
        slot.replaceChildren()
        delete slot.dataset.mounted
      }
      doc.querySelector('[data-cite-dialog]')?.remove()
      delete root.dataset.actionsReady
    },
  }
}

function openCite(doc: Document, cfg: ActionsConfig, f: { panel: Panel; url: string }, opener: HTMLElement, copy: (t: string) => Promise<void>) {
  doc.querySelector('[data-cite-dialog]')?.remove()
  const dialog = doc.createElement('div')
  dialog.className = 'nerds-dialog'
  dialog.dataset.citeDialog = ''
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-labelledby', 'cite-title')
  let format: CiteFormat = 'texto'
  const render = () => {
    const body = citation(format, { edition: cfg.edition, url: f.url, panel: f.panel, place: cfg.place, siteUrl: cfg.siteUrl })
    dialog.innerHTML = `<div class="nerds-dialog__card"><h2 id="cite-title">Citar este painel</h2><button type="button" class="nerds-link" data-close>Fechar ✕</button>
<p class="nerds-chartnote">Escolha o formato e copie. A citação leva a edição, a data e o endereço deste painel, que reabre os mesmos números.</p>
<div class="nerds-picker" role="tablist" aria-label="Formato">${CITE_FORMATS.map((x) => `<button type="button" role="tab" aria-selected="${x.id === format}" data-format="${x.id}">${x.label}</button>`).join('')}</div>
<textarea readonly rows="7" data-cite-text aria-label="Citação"></textarea>
<p><button type="button" class="nerds-action nerds-action--primary" data-copy>Copiar</button> <span role="status" aria-live="polite" data-copied></span></p></div>`
    dialog.querySelector<HTMLTextAreaElement>('[data-cite-text]')!.value = body
  }
  render()
  const close = () => {
    dialog.remove()
    doc.removeEventListener('keydown', onKey)
    opener.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
    if (e.key === 'Tab') {
      const items = [...dialog.querySelectorAll<HTMLElement>('button, textarea')]
      const first = items[0]!
      const last = items.at(-1)!
      if (e.shiftKey && doc.activeElement === first) (e.preventDefault(), last.focus())
      else if (!e.shiftKey && doc.activeElement === last) (e.preventDefault(), first.focus())
    }
  }
  dialog.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    const tab = t.closest<HTMLElement>('[data-format]')
    if (tab) {
      format = tab.dataset.format as CiteFormat
      render()
      dialog.querySelector<HTMLElement>(`[data-format="${format}"]`)!.focus()
    } else if (t.closest('[data-copy]')) {
      const body = dialog.querySelector<HTMLTextAreaElement>('[data-cite-text]')!.value
      void copy(body).then(() => (dialog.querySelector('[data-copied]')!.textContent = 'Copiado para a área de transferência.'), () => (dialog.querySelector('[data-copied]')!.textContent = 'Não foi possível copiar; selecione o texto e copie.'))
    } else if (t.closest('[data-close]') || t === dialog) close()
  })
  doc.addEventListener('keydown', onKey)
  doc.body.append(dialog)
  dialog.querySelector<HTMLElement>('[data-format="texto"]')!.focus()
}

