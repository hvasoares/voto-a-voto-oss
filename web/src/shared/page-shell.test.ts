import { describe, expect, it } from 'vitest'
import { fixtureBannerText } from './fixture-banner'
import { footerClass, mainClass, type FooterShell, type MainShell } from './page-shell'

const tokens = (c: string) => c.split(/\s+/).filter(Boolean).sort()

/**
 * Every `<main>` class the pages wrote by hand before #136, with the choices that now say the same. The builder writes the tokens in one
 * fixed order, so a page that had them in another order changes bytes (never styles): the token SET is what must match.
 */
const OLD_MAINS: [string, string, MainShell][] = [
  ['phone header, md 480', 'mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3 md:max-w-[480px] lg:pt-8', { md: '480' }],
  ['phone header, md 480, lg 1240', 'mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3 md:max-w-[480px] lg:max-w-[1240px] lg:pt-8', { md: '480', lg: '1240' }],
  ['the duel', 'mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3 md:max-w-[480px] lg:max-w-[1240px] lg:pt-8 duel-main', { md: '480', lg: '1240', extra: 'duel-main' }],
  ['press', 'mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3 md:max-w-[880px] lg:pt-8', { md: '880' }],
  ['guide', 'mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3 md:max-w-[720px] lg:pt-8', { md: '720' }],
  ['guess and overlay', 'mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3 md:max-w-[720px] lg:max-w-[1200px] lg:pt-8', { md: '720', lg: '1200' }],
  ['the plain page, md 760', 'mx-auto min-w-0 w-full max-w-[430px] md:max-w-[760px] flex-1 px-5 pt-3 lg:pt-8', { md: '760' }],
  ['the map pages', 'mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3 md:max-w-[720px] lg:grid lg:max-w-[1240px] lg:pt-8', { md: '720', grid: true, lg: '1240' }],
  ['the state map', 'mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3', { deskTop: false }],
  ['Brasil e regiões', 'mx-auto w-full min-w-0 max-w-[430px] flex-1 px-5 pt-3 pb-2 md:max-w-[760px] lg:pt-8', { md: '760', padBottom: true }],
]

const OLD_FOOTERS: [string, string, FooterShell][] = [
  ['report', 'mx-auto mt-2 w-full max-w-[430px] md:max-w-[760px] border-t border-border px-5 pb-6 pt-2 text-center text-step-1 text-primary', { md: '760' }],
  ['wide report', 'mx-auto mt-2 w-full max-w-[430px] md:max-w-[760px] lg:max-w-[1200px] border-t border-border px-5 pb-6 pt-2 text-center text-step-1 text-primary lg:text-left', { md: '760', lg: '1200', leftFromDesktop: true }],
  ['editions', 'mx-auto w-full max-w-[430px] md:max-w-[760px] mt-2 border-t border-border px-5 pb-6 pt-2 text-center text-step-1 text-primary', { md: '760' }],
  ['about page', 'mx-auto w-full max-w-[430px] md:max-w-[760px] mt-2 border-t border-border px-5 pb-2 pt-2 text-center text-step-1 text-primary', { md: '760', pad: 'compact' }],
  ['three cycles', 'mx-auto w-full max-w-[430px] mt-2 border-t border-border px-5 pb-6 pt-2 text-center text-step-1 text-primary', {}],
]

describe('mainClass', () => {
  it.each(OLD_MAINS)('%s: the same tokens as the hand-written class', (_name, old, shell) => {
    expect(tokens(mainClass(shell))).toEqual(tokens(old))
  })

  it('writes the tokens in one fixed order, whatever the choices', () => {
    expect(mainClass({ md: '720', grid: true, lg: '1240' })).toBe(OLD_MAINS[7]![1])
    expect(mainClass({ extra: 'duel-main', lg: '1240', md: '480' })).toBe(OLD_MAINS[2]![1])
  })

  it('defaults to the phone-header column with the desktop top padding', () => {
    expect(mainClass()).toBe('mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3 lg:pt-8')
  })
})

describe('footerClass', () => {
  it.each(OLD_FOOTERS)('%s: the same tokens as the hand-written class', (_name, old, shell) => {
    expect(tokens(footerClass(shell))).toEqual(tokens(old))
  })

  it('writes the report footer exactly', () => {
    expect(footerClass({ md: '760' })).toBe(OLD_FOOTERS[0]![1])
    expect(footerClass({ md: '760', lg: '1200', leftFromDesktop: true })).toBe(OLD_FOOTERS[1]![1])
  })
})

describe('fixtureBannerText', () => {
  const OLD = 'EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS'

  it('the catalog string equals the old literal exactly', () => {
    expect(fixtureBannerText()).toBe(OLD)
  })

  it('the wide separator is the old `.replace(" · ", "  ·  ")`', () => {
    expect(fixtureBannerText(true)).toBe(OLD.replace(' · ', '  ·  '))
  })
})
