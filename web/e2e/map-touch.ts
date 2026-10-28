import type { Page } from '@playwright/test'

/**
 * #88 helpers: what a finger finds on the phone's state-map SVG (/mapa/?vista=mapa), measured in the page with the browser's own
 * hit testing (`document.elementFromPoint`) and geometry (`isPointInFill`, client rects). Shared by the fixture spec (three states)
 * and the real-data spec (all 27).
 */
export interface ShapeTouch {
  uf: string
  /** The drawn shape, CSS px. */
  shape: { w: number; h: number }
  /** The invisible hit path with its stroke (CSS px), or the shape itself when it needs none. */
  hit: { w: number; h: number; invisible: boolean }
  /** The callout row's hit rectangle (CSS px); null for the states drawn big enough to carry their own label. */
  callout: { w: number; h: number } | null
  /** Largest square (CSS px) the state owns on its own, found with a 1 px grid of elementFromPoint, callout apart from shape. */
  ownSquare: { shape: number; callout: number }
  /** A point well inside the drawn shape, and which state a finger on it reaches. */
  centre: { x: number; y: number; reaches: string | null }
  /** Interior points of the drawn shape (2 px grid) whose tap is taken by ANOTHER state's invisible hit area (or reaches nothing): must stay 0. */
  stolen: number
  /** Points of the sea/empty space owned by this state's hit path (the added area). */
  seaOwned: number
}

export async function measureMap(page: Page): Promise<ShapeTouch[]> {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg[role="img"]')!
    const box = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    const k = box.width / vb.width
    const pt = svg.createSVGPoint()
    const inFill = (path: SVGGeometryElement, x: number, y: number) => {
      pt.x = (x - box.left) / k
      pt.y = (y - box.top) / k
      return path.isPointInFill(pt)
    }
    // `invisible`: what a finger reaches there is a hit path or the transparent margin of a callout row, not something drawn.
    const ownerAt = (x: number, y: number): { uf: string; layer: 'shape' | 'callout' | 'hit'; invisible: boolean } | null => {
      const t = document.elementFromPoint(x, y)
      if (!t) return null
      const a = t.closest<SVGAElement>('a[data-uf]')
      if (a) return { uf: a.dataset.uf!, layer: a.querySelector(':scope > rect') ? 'callout' : 'shape', invisible: t.hasAttribute('data-hit') }
      const h = t.closest<SVGElement>('[data-hit]')
      return h ? { uf: h.dataset.hit!, layer: 'hit', invisible: true } : null
    }
    // Ownership grid, 1 CSS px.
    const [W, H] = [Math.floor(box.width), Math.floor(box.height)]
    const grid: ({ uf: string; layer: string } | null)[][] = []
    for (let j = 0; j < H; j++) {
      const row: ({ uf: string; layer: string } | null)[] = []
      for (let i = 0; i < W; i++) row.push(ownerAt(box.left + i + 0.5, box.top + j + 0.5))
      grid.push(row)
    }
    const square = (uf: string, only: (layer: string) => boolean) => {
      let best = 0
      const dp = Array.from({ length: H }, () => new Array<number>(W).fill(0))
      for (let j = 0; j < H; j++)
        for (let i = 0; i < W; i++) {
          const c = grid[j]![i]
          if (!c || c.uf !== uf || !only(c.layer)) continue
          dp[j]![i] = 1 + (i && j ? Math.min(dp[j - 1]![i]!, dp[j]![i - 1]!, dp[j - 1]![i - 1]!) : 0)
          best = Math.max(best, dp[j]![i]!)
        }
      return best
    }
    const out: unknown[] = []
    for (const a of svg.querySelectorAll<SVGAElement>('a[data-uf]')) {
      const path = a.querySelector<SVGGeometryElement>(':scope > path')
      if (!path) continue // the callout anchor of a state (rect + text); its shape anchor is measured
      const uf = a.dataset.uf!
      const r = path.getBoundingClientRect()
      const hitPath = svg.querySelector<SVGGeometryElement>(`path[data-hit="${uf}"]`)
      const hr = hitPath?.getBoundingClientRect()
      const sw = hitPath ? parseFloat(hitPath.getAttribute('stroke-width') ?? '0') * k : 0
      const call = svg.querySelector<SVGRectElement>(`rect[data-hit="${uf}"]`)?.getBoundingClientRect()
      // A point well inside the drawn shape: the first of the grid points (nearest the box centre) that keeps a ring of r px in the fill.
      const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2]
      let centre = null as { x: number; y: number } | null
      for (const ring of [4, 3, 2, 1.5, 1, 0.5]) {
        let bestD = Infinity
        for (let y = r.top; y <= r.bottom; y += 0.5)
          for (let x = r.left; x <= r.right; x += 0.5) {
            const d = (x - cx) ** 2 + (y - cy) ** 2
            if (d >= bestD || !inFill(path, x, y)) continue
            let ok = true
            for (let n = 0; n < 12 && ok; n++) ok = inFill(path, x + ring * Math.cos((n * Math.PI) / 6), y + ring * Math.sin((n * Math.PI) / 6))
            if (ok) [bestD, centre] = [d, { x, y }]
          }
        if (centre) break
      }
      let stolen = 0
      for (let y = Math.ceil(r.top); y <= r.bottom; y += 2)
        for (let x = Math.ceil(r.left); x <= r.right; x += 2) {
          if (![[2, 0], [-2, 0], [0, 2], [0, -2]].every(([dx, dy]) => inFill(path, x + dx!, y + dy!)) || !inFill(path, x, y)) continue
          // Drawn shapes of the simplified outlines overlap each other by a pixel or two: that is the drawing's, not a hit path's doing.
          const o = ownerAt(x, y)
          if (o && o.uf !== uf && o.invisible) stolen++
          if (!o) stolen++
        }
      let seaOwned = 0
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (grid[j]![i]?.uf === uf && grid[j]![i]?.layer === 'hit') seaOwned++
      out.push({
        uf,
        shape: { w: r.width, h: r.height },
        hit: hr ? { w: hr.width + sw, h: hr.height + sw, invisible: true } : { w: r.width, h: r.height, invisible: false },
        callout: call ? { w: call.width, h: call.height } : null,
        ownSquare: { shape: square(uf, (l) => l === 'shape' || l === 'hit'), callout: square(uf, (l) => l === 'callout') },
        centre: { ...(centre ?? { x: cx, y: cy }), reaches: centre ? (ownerAt(centre.x, centre.y)?.uf ?? null) : null },
        stolen,
        seaOwned,
      })
    }
    return out as ShapeTouch[]
  })
}
