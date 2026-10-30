import { describe, expect, it } from 'vitest'
import { loadCityRoutes } from '../src/lib/city-routes'
import { validatePageData } from '../src/shared/page-data'
import { joinPageData, pageDataFiles } from './page-data'
import { QR_FAMILY, qrPageRecords } from './qr-pages'

/**
 * The QR family's records (private#208): a golden of the data file on the fixture, and the join of the writer over the route list of the family.
 * The file is what `drawQrScreen` draws, so its bytes are pinned the way the glyph's matrix is (qr-code.test.ts).
 */
const FP = '0123456789abcdef'
const ORIGIN = 'https://votoavoto.exemplo.br'
const records = async (base = '/') => qrPageRecords(await loadCityRoutes(), true, base, ORIGIN)

describe('the QR data files (golden)', () => {
  it('pins the file of the fixture city', async () => {
    const [file] = pageDataFiles(FP, QR_FAMILY, (await records()).filter((r) => r.path === 'rj/cidade-exemplo'))
    expect(file!.path).toBe(`v${FP}/qr/rj/cidade-exemplo.json`)
    expect(file!.json).toMatchInlineSnapshot(
      `"{"data":{"address":"votoavoto.exemplo.br/rj/cidade-exemplo","backHref":"/rj/cidade-exemplo/compartilhar/","cityName":"Cidade Exemplo","closeHref":"/rj/cidade-exemplo/","fixture":true,"modules":"fe4abb3fc104d7106eb0a32bb7560455dbad3cd2ec14609507faaaaafe01d13900be2e52be6e862c9b5d95d09ac5bd8ce9f3b0b995c4ce49098e9cfea99cab624cccae3bcbd8c6055dbb6dabcab6dbb241cbfa6ab24ddd4c9e6b369a60594d79c9784f871252f980637cc57f97d0ea90569f31dbad29efcdd71b0a56eacf2cd9046e0c5cfec761910","size":33,"url":"https://votoavoto.exemplo.br/rj/cidade-exemplo/"},"family":"qr","path":"rj/cidade-exemplo","sum":"96fe35c5","v":1}"`,
    )
  })

  it('carries the base path in the links and the address of the QR', async () => {
    const [file] = pageDataFiles(FP, QR_FAMILY, (await records('/voto-a-voto-oss/')).filter((r) => r.path === 'rj/cidade-exemplo'))
    expect(JSON.parse(file!.json).data).toMatchObject({
      url: `${ORIGIN}/voto-a-voto-oss/rj/cidade-exemplo/`,
      closeHref: '/voto-a-voto-oss/rj/cidade-exemplo/',
      backHref: '/voto-a-voto-oss/rj/cidade-exemplo/compartilhar/',
    })
  })

  it('every file passes the shape validator', async () => {
    for (const f of pageDataFiles(FP, QR_FAMILY, await records())) expect(validatePageData(JSON.parse(f.json), { family: QR_FAMILY })).toMatchObject({ ok: true })
  })
})

describe('the join of the QR family', () => {
  it('has exactly one file for each city route of the build, and no file without a page', async () => {
    const routes = (await loadCityRoutes()).map((c) => `${c.uf}/${c.slug}`)
    expect(routes.length).toBeGreaterThan(1)
    expect(joinPageData(QR_FAMILY, FP, routes, pageDataFiles(FP, QR_FAMILY, await records()).map((f) => f.path))).toEqual([])
  })
})
