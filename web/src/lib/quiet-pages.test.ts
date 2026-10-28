import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** The pages that promise no analytics (the creator guide #67, the overlay #68) are built on the quiet shell and import nothing that talks to the analytics. */
const SRC = join(import.meta.dirname, '..')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')

describe('quiet pages', () => {
  it('the quiet shell has no metrics boot, no notice banner and no support link', () => {
    const shell = read('layouts/QuietDoc.astro').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(shell).not.toMatch(new RegExp(['analytics-boot', 'ConsentBanner', 'Donation' + 'Link'].join('|')))
  })
  it.each(['pages/fale-sem-errar/index.astro', 'components/CreatorGuide.tsx', 'lib/creator-phrases.ts', 'pages/overlay/index.astro', 'pages/overlay/tela/index.astro', 'components/OverlayView.tsx', 'components/OverlayBuilder.tsx', 'lib/overlay.ts'])('%s does not import the analytics and has no ad', (file) => {
    const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toMatch(/@\/analytics|getAnalytics|gtag/)
  })
  it('the guide page is on the quiet shell', () => {
    expect(read('pages/fale-sem-errar/index.astro')).toContain("import QuietDoc from '@/layouts/QuietDoc.astro'")
  })
})
