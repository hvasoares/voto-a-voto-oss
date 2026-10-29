import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { walkFiles } from '../../scripts/walk'
import { withBuildLock } from '../../scripts/build-lock'
import { placeExceptions } from '@/lib/place-except'
import { PLACE_WORDS, splitPlaces } from '@/lib/place-link'
import { REGION_ORDER } from '@/lib/regions'
import { UF_NOME } from '@/lib/uf-names'
import { placeMentions } from '@/test/place-mentions'

/*
 * Every UF and every region mention is a link (#184). The guard reads every page of a fixture build and fails naming the page and the words around a state (abbreviation
 * or name) or a region that is outside a link. The allow-list is the ticket's (a page's own title or heading, form controls, the text inside a shared picture) and what
 * cannot be a link (a tile of a state the dataset has no page for, the page's own current tab, the disclosure that shows a filter's current value); `src/test/place-mentions.ts`
 * documents it. The words are the ones the link helper reads (`lib/place-link.ts`, from `uf-names.ts` and `regions.ts`), so a state or a region added to the data is looked for at once.
 */

describe('the words of the guard are the data: 27 states by abbreviation and by name, and the five regions', () => {
  it('covers every UF but the overseas post, in both spellings, and every region', () => {
    const states = Object.keys(UF_NOME).filter((uf) => uf !== 'zz')
    expect(states).toHaveLength(27)
    for (const uf of states) expect(PLACE_WORDS).toEqual(expect.arrayContaining([uf.toUpperCase(), UF_NOME[uf]]))
    expect(PLACE_WORDS).toEqual(expect.arrayContaining(['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']))
    expect(REGION_ORDER).toHaveLength(5)
  })
})

describe('placeMentions finds a place outside a link', () => {
  const page = (body: string, head = '') => `<html><head>${head}</head><body>${body}</body></html>`

  it.each([
    ['an abbreviation in a paragraph', '<p>Cidade Exemplo/RJ foi a mais apertada.</p>', 'RJ'],
    ['a state name in a list', '<ul><li>Mato Grosso do Sul</li></ul>', 'Mato Grosso do Sul'],
    ['a region in a table cell', '<table><tr><td>Sudeste</td></tr></table>', 'Sudeste'],
    ['a region in a heading that is not the page title', '<h2>Resultado no Centro-Oeste</h2>', 'Centro-Oeste'],
    ['a state beside a link, not inside it', '<p><a href="/x/">Cidade</a> · SP</p>', 'SP'],
  ])('%s', (_what, body, name) => {
    expect(placeMentions(page(body)).map((m) => m.name)).toContain(name)
  })

  it.each([
    ['inside a link', '<p><a href="/rj/">RJ ›</a></p>'],
    ['the page title and its h1', '<h1>Estado selecionado: RJ</h1>', '<title>Rio de Janeiro</title>'],
    ['a form control', '<input placeholder="Busque sua cidade em RJ"><select><option>São Paulo</option></select><textarea>Sul</textarea>'],
    ['a shared picture', '<svg><text>RJ -0,5</text></svg><img alt="Sudeste">'],
    ['a tile of a state with no page', '<span aria-disabled="true">RR</span>'],
    ['the current tab of the page', '<span aria-current="page">MT</span>'],
    ['a lower-case word of the language', '<p>se não, ao sul e ao norte, ou pa e ba</p>'],
    ['a city whose name holds a region', '<p>Boa Esperança do Norte</p>'],
  ])('lets %s pass', (_what, body, head = '') => {
    expect(placeMentions(page(body, head), ['Boa Esperança do Norte'])).toEqual([])
  })

  it('reads the mention a link-text transform leaves out: text split into plain stretches and links', () => {
    expect(splitPlaces('Em RJ e no Sul, Santa Cruz do Sul', ['Santa Cruz do Sul']).filter((s) => s.place).map((s) => s.text)).toEqual(['RJ', 'Sul'])
  })
})

describe('every page of the fixture build (#184)', () => {
  const WEB = join(import.meta.dirname, '..', '..')
  const out = mkdtempSync(join(tmpdir(), 'place-links-'))

  beforeAll(() => {
    const env: NodeJS.ProcessEnv = { ...process.env, SITE_BASE: '/', OUT_DIR: out, PUBLIC_DONATION_URL: '' }
    delete env.DATA_DIR // the committed fixtures: the same pages in every checkout
    // vitest's own Vite env would leak into the child build and override its base
    for (const key of ['BASE_URL', 'MODE', 'DEV', 'PROD', 'SSR', 'NODE_ENV', 'VITEST', 'VITEST_MODE', 'VITEST_POOL_ID', 'VITEST_WORKER_ID']) delete env[key]
    withBuildLock(WEB, () => execFileSync('npx', ['astro', 'build'], { cwd: WEB, env, stdio: 'pipe' }))
  }, 240_000)

  afterAll(() => rmSync(out, { recursive: true, force: true }))

  it('names no state and no region outside a link', async () => {
    const except = await placeExceptions()
    const pages = walkFiles(out).filter((p) => p.endsWith('.html'))
    expect(pages.length, 'the build produced pages').toBeGreaterThan(100)
    const problems = pages.flatMap((p) => placeMentions(readFileSync(p, 'utf8'), except).map((m) => `${relative(out, p).split(sep).join('/')}: "${m.name}" in "${m.context}"`))
    expect(problems.slice(0, 15).join('\n'), `${problems.length} mentions outside a link`).toBe('')
  }, 120_000) // it reads every built page: over the 5 s default on the CI runner (the Pages build failed on it)

  it('links the state under the city name and drops the footer link to the state', () => {
    const html = readFileSync(join(out, 'rj', 'cidade-exemplo', 'index.html'), 'utf8')
    expect(html).toMatch(/<p class="page__subtitle">Município fictício · <a [^>]*data-place="uf"[^>]*href="\/rj\/"[^>]*>RJ ›<\/a><\/p>/)
    expect(html).not.toContain('Ver o estado')
  })

  it('links each region name on Brasil e regiões to its page', () => {
    const html = readFileSync(join(out, 'brasil', 'index.html'), 'utf8')
    for (const regiao of ['sudeste', 'centro-oeste']) expect(html).toContain(`data-place="regiao" href="/brasil/${regiao}/"`)
  })
})
