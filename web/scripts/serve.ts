/**
 * Static server that behaves like GitHub Pages: /x/ -> x/index.html, /x -> 301 /x/, unknown path ->
 * 404 status with 404.html as body, SITE_BASE prefix honoured. No server logic beyond files.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { normalizeBase } from '../src/paths'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
}

export function startServer(root = resolve(process.env.OUT_DIR ?? 'dist'), port = Number(process.env.PORT ?? 4173), base = normalizeBase(process.env.SITE_BASE)) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const send = async (file: string, status: number) => {
      const body = await readFile(file)
      res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
      res.end(body)
    }
    const notFound = () => send(join(root, '404.html'), 404)
    if (!url.pathname.startsWith(base) && url.pathname + '/' !== base) return notFound()
    let rel = normalize(decodeURIComponent(url.pathname.slice(base.length - 1))).replace(/^\/+/, '')
    if (rel.includes('..')) return notFound()
    const target = join(root, rel)
    try {
      const s = await stat(target)
      if (s.isDirectory()) {
        if (!url.pathname.endsWith('/')) {
          res.writeHead(301, { location: url.pathname + '/' + url.search })
          return res.end()
        }
        return await send(join(target, 'index.html'), 200)
      }
      return await send(target, 200)
    } catch {
      return notFound()
    }
  })
  return new Promise<typeof server>((ok) => server.listen(port, () => ok(server)))
}

const port = Number(process.env.PORT ?? 4173)
const base = normalizeBase(process.env.SITE_BASE)
await startServer(resolve(process.env.OUT_DIR ?? 'dist'), port, base)
console.log(`serving dist on http://localhost:${port}${base}`)