/**
 * TEST DOUBLE of a CDN, for the CDN mechanism tests only. It is NOT a provider and its address is not a real one.
 * Builds react, react-dom, react-dom/client and react/jsx-runtime from node_modules into ES modules (each one keeps the
 * others external, resolved by the page import map, exactly as modules from a real CDN would be), serves them with CORS on
 * FAKE_CDN_PORT (default 4179) and writes a cdn config with their integrity hashes to FAKE_CDN_CONFIG (default test-results/cdn-fake.config.json).
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { build } from 'vite'

const port = Number(process.env.FAKE_CDN_PORT ?? 4179)
const origin = `http://localhost:${port}`
const configFile = resolve(process.env.FAKE_CDN_CONFIG ?? 'test-results/cdn-fake.config.json')
const work = resolve('test-results/fake-cdn')
const require = createRequire(import.meta.url)
const specifiers = ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'] as const
const fileOf = (s: string) => s.replace('/', '-') + '.js'

const version: string = JSON.parse(readFileSync(require.resolve('react/package.json'), 'utf8')).version
/** React's CommonJS files call require('react'); in an ES module that must be an import of the (external) specifier, resolved by the page import map. */
function externalRequires(externals: string[]) {
  return {
    name: 'fake-cdn-external-requires',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.includes('node_modules')) return undefined
      let out = code
      let head = ''
      externals.forEach((spec, i) => {
        const call = new RegExp(`require\\((["'])${spec.replace('/', '\\/')}\\1\\)`, 'g')
        if (call.test(out)) {
          out = out.replace(call, `__ext${i}`)
          head += `import __ext${i} from '${spec}';\n`
        }
      })
      return head ? { code: head + out, map: null } : undefined
    },
  }
}

const files = new Map<string, string>()
const libraries: Record<string, { version: string; url: string; integrity: string }> = {}

mkdirSync(work, { recursive: true })
for (const spec of specifiers) {
  const names = Object.keys(require(spec)).filter((n) => n !== 'default')
  const entry = resolve(work, `entry-${fileOf(spec)}`)
  writeFileSync(entry, `import M from '${spec}'\nexport const { ${names.join(', ')} } = M\nexport default M\n`)
  const out = resolve(work, 'out', spec.replace('/', '-'))
  await build({
    logLevel: 'silent',
    configFile: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [externalRequires(specifiers.filter((s) => s !== spec))],
    build: {
      outDir: out,
      emptyOutDir: true,
      minify: true,
      lib: { entry, formats: ['es'], fileName: () => fileOf(spec) },
      rollupOptions: { external: specifiers.filter((s) => s !== spec) },
    },
  })
  const code = readFileSync(resolve(out, fileOf(spec)), 'utf8')
  const path = `/${spec.replace('/', '-')}@${version}/${fileOf(spec)}`
  files.set(path, code)
  libraries[spec] = { version, url: origin + path, integrity: 'sha384-' + createHash('sha384').update(code).digest('base64') }
}
mkdirSync(dirname(configFile), { recursive: true })
writeFileSync(configFile, JSON.stringify({ approvedOrigins: [origin], libraries }, null, 2) + '\n')

createServer((req, res) => {
  const code = files.get(new URL(req.url ?? '/', origin).pathname)
  res.setHeader('access-control-allow-origin', '*')
  if (!code) return void res.writeHead(404).end()
  res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }).end(code)
}).listen(port, () => console.log(`fake CDN (test double) on ${origin}, config ${configFile}`))
