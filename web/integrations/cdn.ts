/**
 * Libraries from a CDN, production build only.
 *
 * `cdn.config.json` lists approved CDN origins and, per import specifier ("react", "react-dom", ...), a pinned
 * version, an exact URL and an integrity hash. Nothing is configured by default, so the production build bundles
 * everything locally until the user chooses a provider and fills the file in.
 *
 * When libraries are configured AND the build target is production (BUILD_TARGET=production):
 *  - the client build treats those specifiers as external (the build itself never contacts a CDN);
 *  - every page gets an import map (`virtual:cdn-importmap`) mapping each specifier to its CDN URL, with an
 *    `integrity` entry, so the browser verifies the file. Because the import map is per document, every module
 *    (the island and the CDN's own files) resolves "react" to the same URL: one copy of React.
 * Local, test and screenshot builds ignore the config and bundle everything from node_modules.
 */
import type { AstroIntegration } from 'astro'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

export interface CdnLibrary {
  version: string
  url: string
  integrity: string
}
export interface CdnConfig {
  approvedOrigins: string[]
  libraries: Record<string, CdnLibrary>
}
export interface CdnPlan {
  externals: string[]
  importMap: { imports: Record<string, string>; integrity: Record<string, string> }
}

export class CdnConfigError extends Error {}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])
const packageOf = (specifier: string) => (specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]!)

/** Pure: validates the config and returns what the build must do, or undefined when everything is bundled. */
export function resolveCdn(config: CdnConfig, target: 'local' | 'production', installed: Record<string, string>): CdnPlan | undefined {
  const entries = Object.entries(config.libraries)
  if (target !== 'production' || entries.length === 0) return undefined
  if (!('react' in config.libraries) !== !('react-dom' in config.libraries)) throw new CdnConfigError('react and react-dom must come from the CDN together (one copy of React)')
  for (const [name, lib] of entries) {
    const where = `cdn.config.json library "${name}"`
    let url: URL
    try {
      url = new URL(lib.url)
    } catch {
      throw new CdnConfigError(`${where}: url is not absolute`)
    }
    if (!config.approvedOrigins.includes(url.origin)) throw new CdnConfigError(`${where}: origin ${url.origin} is not in approvedOrigins`)
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOOPBACK.has(url.hostname))) throw new CdnConfigError(`${where}: only https is allowed`)
    if (!/^sha(256|384|512)-[A-Za-z0-9+/=]+$/.test(lib.integrity ?? '')) throw new CdnConfigError(`${where}: integrity hash (sha256-, sha384- or sha512-) is required`)
    const have = installed[packageOf(name)]
    if (!lib.version || lib.version !== have) throw new CdnConfigError(`${where}: version ${lib.version} is not the installed ${have} (server render and browser must run the same version)`)
    if (!lib.url.includes(lib.version)) throw new CdnConfigError(`${where}: version is not pinned in the url (expected ${lib.version} in it)`)
  }
  return {
    externals: entries.map(([name]) => name),
    importMap: {
      imports: Object.fromEntries(entries.map(([name, lib]) => [name, lib.url])),
      integrity: Object.fromEntries(entries.map(([, lib]) => [lib.url, lib.integrity])),
    },
  }
}

export function loadPlan(root: string, env: Record<string, string | undefined> = process.env): CdnPlan | undefined {
  const file = resolve(root, env.CDN_CONFIG ?? 'cdn.config.json')
  const config = JSON.parse(readFileSync(file, 'utf8')) as CdnConfig
  const installed: Record<string, string> = {}
  for (const name of new Set(Object.keys(config.libraries).map(packageOf))) {
    const pkg = resolve(root, 'node_modules', name, 'package.json')
    if (existsSync(pkg)) installed[name] = JSON.parse(readFileSync(pkg, 'utf8')).version
  }
  return resolveCdn(config, env.BUILD_TARGET === 'production' ? 'production' : 'local', installed)
}

export function cdn(): AstroIntegration {
  return {
    name: 'voto-cdn',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, logger }) => {
        const plan = loadPlan(new URL(config.root).pathname)
        if (plan) logger.info(`CDN: ${plan.externals.join(', ')} are loaded from the CDN (production build)`)
        const virtualId = 'virtual:cdn-importmap'
        const plugin: Plugin = {
          name: 'voto-cdn',
          // Only the browser build: the server render (build time, Node) keeps using node_modules.
          configEnvironment: (name) => (plan && name === 'client' ? { build: { rollupOptions: { external: plan.externals } } } : undefined),
          resolveId: (source) => (source === virtualId ? '\0' + virtualId : undefined),
          load: (source) => (source === '\0' + virtualId ? `export default ${JSON.stringify(plan ? JSON.stringify(plan.importMap) : '')}` : undefined),
        }
        updateConfig({ vite: { plugins: [plugin] } })
      },
    },
  }
}
