/**
 * Reader of one pre-rendered city shard (`city/<uf>/<slug>.json`, layout in web/docs/shards.md) into the pure
 * `CityResult` numbers. PURE: no HTML, no file access, no fetch — pages, tests and the share sheet build their
 * views from this, so the numbers come out regardless of who reads the shard. The shard's `candidates` block is
 * shared by every city (names keyed by cycle, round and number; a number is not the same person in another year).
 */
import type { Turno } from '../data'
import { buildCityResult, type CityResult } from '../shared/city-model'

/** Shape of `city/<uf>/<slug>.json` as the shard builder writes it. */
export interface CityShard {
  city: {
    uf: string
    slug: string
    nome: string
    regiao: string
    cdMunicipio: string
    cdIbge: string
    ciclos: number[]
  }
  cycles: {
    [ano: string]: {
      [turno: string]: {
        [field: string]: number | Record<string, number>
      }
    }
  }
  candidates: {
    [ano: string]: {
      [turno: string]: Record<string, string[]>
    }
  }
}

const TURNOUT_FIELDS = ['aptos', 'comparecimento', 'abstencoes', 'brancos', 'nulos', 'anuladosApuSep', 'validos'] as const

/**
 * The numbers of one city, cycle and round from its shard. undefined when the shard has no turnout block for this
 * cycle and round (the pages show "sem dados nesse ciclo", never zeros; the block may carry votes without turnout
 * only if the dataset ever did, and that is still no data for the screens).
 */
export function cityShardResult(shard: CityShard, ano: number, turno: Turno): CityResult | undefined {
  const block = shard.cycles[String(ano)]?.[String(turno)]
  if (!block || typeof block.aptos !== 'number') return undefined
  const field = (f: (typeof TURNOUT_FIELDS)[number]): number => (typeof block[f] === 'number' ? (block[f] as number) : 0)
  const turnout = {
    ano,
    turno,
    uf: shard.city.uf,
    cdMunicipio: shard.city.cdMunicipio,
    aptos: field('aptos'),
    comparecimento: field('comparecimento'),
    abstencoes: field('abstencoes'),
    brancos: field('brancos'),
    nulos: field('nulos'),
    anuladosApuSep: field('anuladosApuSep'),
    validos: field('validos'),
  }
  const votes = Object.entries(
    typeof block.votes === 'object' ? block.votes : {},
  ).map(([numero, votos]) => ({ ano, turno, uf: shard.city.uf, cdMunicipio: shard.city.cdMunicipio, candidatoNumero: Number(numero), votos }))
  const names = shard.candidates[String(ano)]?.[String(turno)] ?? {}
  const candidates = Object.entries(names).map(([numero, row]) => ({
    ano,
    turno,
    candidatoNumero: Number(numero),
    nomeUrna: row![0]!,
    partido: row![1]!,
  }))
  return buildCityResult({ turnout, votes, candidates })
}

/**
 * The check of a city shard read in the browser (private#216: the three-cycles page draws from the shard the city card already links, no file of its own):
 * the file must be the shard of the city the page is for, and carry the blocks `cityShardResult` reads. A file for another city, or one cut short, is refused.
 */
export function checkCityShard(json: unknown, path: string): { ok: true; data: CityShard } | { ok: false; error: string } {
  const shard = json as Partial<CityShard> | null
  if (shard === null || typeof shard !== 'object' || Array.isArray(shard)) return { ok: false, error: 'not an object' }
  const { city, cycles, candidates } = shard
  if (!city || typeof city !== 'object' || !cycles || typeof cycles !== 'object' || !candidates || typeof candidates !== 'object') return { ok: false, error: 'missing city, cycles or candidates' }
  if (`${city.uf}/${city.slug}` !== path) return { ok: false, error: `wrong address ${city.uf}/${city.slug}` }
  return { ok: true, data: shard as CityShard }
}
