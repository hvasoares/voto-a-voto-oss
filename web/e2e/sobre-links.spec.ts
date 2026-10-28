import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'

/*
 * #98: the anchors of /sobre-os-dados/ are public addresses (Home's "Conferir um número", the top bar, the privacy link of every
 * footer, the API page...). This walks every page of the fixture build, collects each link into `sobre-os-dados/#...` and
 * checks the anchor exists on the built page. It reads the built files, so it needs no browser.
 */
const dist = resolve(process.env.OUT_DIR ?? 'dist')

function* htmlFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (statSync(file).isDirectory()) yield* htmlFiles(file)
    else if (name.endsWith('.html')) yield file
  }
}

test('every link into /sobre-os-dados/#... in the built site finds its anchor', () => {
  const about = readFileSync(join(dist, 'sobre-os-dados', 'index.html'), 'utf8')
  const ids = new Set([...about.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
  const found = new Map<string, string>()
  for (const file of htmlFiles(dist)) {
    for (const m of readFileSync(file, 'utf8').matchAll(/href="[^"#]*sobre-os-dados\/?#([^"]+)"/g)) found.set(m[1]!, file)
  }
  // the privacy link of every footer and the edition links of the API page are among them
  expect([...found.keys()]).toEqual(expect.arrayContaining(['privacidade', 'edicoes', 'usar-os-dados']))
  const broken = [...found].filter(([id]) => !ids.has(id)).map(([id, file]) => `#${id} (from ${file})`)
  expect(broken).toEqual([])
})

test('the old addresses of the page all still exist', () => {
  const about = readFileSync(join(dist, 'sobre-os-dados', 'index.html'), 'utf8')
  for (const id of ['calculo', 'conferido', 'confira', 'final-nao-ao-vivo', 'edicoes', 'dados-abertos', 'pendencias', 'limites', 'licenca', 'licencas', 'jornalistas', 'usar-os-dados', 'widget-cidade', 'codigo', 'privacidade', 'guardado-no-aparelho', 'apoio', 'de-onde-vem']) {
    expect(about, id).toContain(`id="${id}"`)
  }
})
