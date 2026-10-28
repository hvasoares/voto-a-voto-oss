import { useEffect, useRef } from 'react'
import { enhanceTable, type Provenance } from '@/lib/nerds/table-enhance'

/**
 * The island of the Tabela de detalhe (#76). The table is already in the HTML (complete without scripts); this island, loaded only from 1024 px up and only when in view
 * (client:panel), upgrades it in place: filter, sort, paging, rows that open into the next level, CSV. It renders a 1 px sentinel (so the lazy directive has something to
 * watch) and works on the table next to it; `data-ready` on the table wrapper says it is attached.
 */
interface Props {
  shardsUrl: string
  base: string
  provenance: Provenance
}

export default function DetalheEnhancer({ shardsUrl, base, provenance }: Props) {
  const sentinel = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const wrap = sentinel.current?.closest('[data-panel]')?.querySelector<HTMLElement>('.nerds-tablewrap')
    if (!wrap) return
    const enhanced = enhanceTable(wrap, { shardsUrl, base, provenance })
    return () => enhanced.destroy()
  }, [shardsUrl, base, provenance])
  return <span ref={sentinel} className="nerds-sentinel" aria-hidden="true" />
}
