import { useEffect, useRef } from 'react'
import { mountActions, type ActionsConfig } from '@/lib/nerds/panel-actions'
import { saveBlob, svgToPng } from '@/lib/share-raster'

/** The actions island (#80): a 1 px sentinel for the lazy directive and, once mounted, Citar / CSV / Imagem in the header of every panel; see lib/nerds/panel-actions.ts. */
export default function PanelActions(props: Omit<ActionsConfig, 'saveImage' | 'saveText' | 'copy'>) {
  const sentinel = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const root = sentinel.current?.closest<HTMLElement>('[data-page="nerds"]')
    if (!root) return
    const mounted = mountActions(root, { ...props, saveImage: async (svg, filename) => saveBlob(await svgToPng(svg, filename, { width: 1600, height: 900 }), filename) })
    return () => mounted.destroy()
  }, [props])
  return <span ref={sentinel} className="nerds-sentinel" aria-hidden="true" />
}
