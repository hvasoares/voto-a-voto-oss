/**
 * Factual content of the "Sobre os dados" page: every figure on the page comes from here or from the
 * manifest table below, and each one is copied from a committed source and cross-checked by
 * `src/lib/about-data.test.ts` against the raw file it claims to paraphrase.
 *
 * - SOURCES, FILES_2026, NATIONAL_2026_R2, REMAINDER, OUTPUT_ROWS, ELECTORATE_2022: data/manifest.json.
 * - SECTIONS_APURADAS: thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md
 *   ("Sections counted: 497.897 of 497.897"), the same figure as the Sketch frame of this page.
 * - BOA_ESPERANCA (city created in 2026, no data for 2018/2022; 5.570 of 5.571 in the open-data cycles)
 *   and SALVADOR_2018_R1 (anulados_apu_sep, 746 votes, zone 18): thoughts/shared/plans/
 *   2026-10-26-make-data-tse-sources.md phases 2 and 3 and README "make data".
 * - UNINSTALLED Overseas posts (40 posts / 80 post-rounds, vote 0 with an electorate): plan phase 1 findings.
 * - Margin and swing definitions: the same files the reports use (definitions section of the highlights note).
 *
 * Neutrality rules of the wording review (web/docs/checkpoints/issue-18.md): the two runoff candidates
 * are named and treated identically; Lula appears where candidate 13 won, Flavio Bolsonaro where 22
 * won in 2026, and 2022 comparisons always pair Lula (13) with Lula and Flavio Bolsonaro with the
 * same number 22 (Bolsonaro), as the pipeline does.
 */

/** One row of the manifest `sources` list, as shown in the "Manifesto" table of the page. */
export interface SourceLine {
  /** File name on the source side (the manifest `id`, more readable here). */
  label: string
  /** What the site uses it for, in plain Portuguese. */
  kind: string
  /** ISO, as recorded in data/manifest.json (`retrieved_at`); the 2026 source has only the collection date. */
  retrievedAt: string
  /** Bytes of the source; 0 when the source is a whole set of files (no single size). */
  bytes: number
  /** SHA-256 of the source, full; shown truncated with the full value in the title and the manifest. */
  sha256: string
  /** Only the 2026 results site: files collected and how many came marked final (`and = f`). */
  files?: number
  final?: number
  /** Only the 2026 results site: newest TSE generation timestamp seen in a collected file. */
  newestGeneration?: string
  /** Only the 2026 results site: SHA-256 digest of the sorted `name sha256` lines of every file used. */
  digest?: string
}

export const SOURCES: SourceLine[] = [
  {
    label: 'votacao_candidato_munzona_2018.zip',
    kind: 'Dados abertos do TSE: votos de presidente por município e zona',
    retrievedAt: '2026-10-26T21:55:20Z',
    bytes: 395389280,
    sha256: 'f880848ef4ba340b15cb91ff0754aa370d34ca7b7e605d6607c0f2a75009adc8',
  },
  {
    label: 'detalhe_votacao_munzona_2018.zip',
    kind: 'Dados abertos do TSE: aptos, comparecimento, abstenção, brancos e nulos',
    retrievedAt: '2026-10-26T21:55:28Z',
    bytes: 4269741,
    sha256: 'df68c258a2261dff37b379f65ea5f2e8de7b3d824bb2340d8f4830274a3fabb5',
  },
  {
    label: 'votacao_candidato_munzona_2022.zip',
    kind: 'Dados abertos do TSE: votos de presidente por município e zona',
    retrievedAt: '2026-10-26T21:55:27Z',
    bytes: 642592078,
    sha256: '56265a50afc3765efeabc3d88b1e8ef35796ac38572fb1344496f3d3c8543369',
  },
  {
    label: 'detalhe_votacao_munzona_2022.zip',
    kind: 'Dados abertos do TSE: aptos, comparecimento, abstenção, brancos e nulos',
    retrievedAt: '2026-10-26T21:55:28Z',
    bytes: 4429327,
    sha256: 'dbf41c5e95c2efedc72848bd0ec70a47f419b539c82e893388314749617ea2f4',
  },
  {
    label: 'resultados.tse.jus.br/oficial/ele2026',
    kind: 'Resultados oficiais assinados, um arquivo por município (1º e 2º turnos)',
    retrievedAt: '2026-10-26',
    bytes: 0,
    sha256: '',
    files: 11517,
    final: 11516,
    newestGeneration: '2026-10-25T23:27:44',
    digest: '62db05bd3b2b103ea650e58e63d52b4fa08943b120ada2520823ea46b78ee10f',
  },
]

/** Sections of 2026 counted, from the TSE final data (highlights note, 26/10/2026). */
export const SECTIONS_APURADAS = { counted: 497897, total: 497897 } as const

/** Brazilian municipalities with data in the 2026 results (plus OVERSEAS_POSTS_2026 posts, region `exterior`). */
export const BR_CITIES_2026 = 5571
export const OVERSEAS_POSTS_2026 = 186
/** Municipalities in each open-data cycle: 5.570 of 5.571 (see BOA_ESPERANCA below). */
export const BR_CITIES_2018_2022 = 5570

/** Boa Esperança do Norte/MT exists only in 2026; the site shows “sem dados”, never zero. */
export const CITY_WITHOUT_DATA_BEFORE_2026 = 'Boa Esperança do Norte/MT'

/** In 2026, 40 overseas posts (80 post-rounds) were not installed: electorate declared, turnout 0. */
export const OVERSEAS_NOT_INSTALLED_2026 = { postRounds: 80, posts: 40 } as const

/** National runoff result of 2026, TSE's own national file, overseas included (manifest `national_reference`). */
export const NATIONAL_2026_R2 = {
  lula: 64256232,
  flavio: 59826041,
  validos: 124082273,
} as const

/** Per cycle: national `aptos - comparecimento - abstenções` in the collected file; in 2018 and 2022 it equals the electorate of uninstalled sections the TSE reports (manifest `turnout_identity`). */
export const TURNOUT_REMAINDER = { '2018': 470, '2022': 657, '2026': 423 } as const

/** Salvador/BA, 1º turno de 2018, 18ª zona: comparecimento com 746 votos anulados em apuração separada (README "make data"). */
export const SALVADOR_ANULADOS_APU_SEP = 746

/** Electorate of 2022, the only national constant re-verified against a second TSE file (plan phase 3). */
export const ELECTORATE_2022_RECONFIRMED = 156454011

/** Rows of the committed tables the site reads (manifest `outputs`). */
export const OUTPUT_ROWS = { 'cities.csv': 5760, 'turnout.csv': 34498, 'votes.csv': 240981, 'candidates.csv': 42 } as const

/** Repository of the project, linked from "Confira você mesmo" and "Código aberto". */
export const GITHUB_URL = 'https://github.com/hvasoares/voto-a-voto'
/** Path of the manifest inside the repository, for the GitHub link of the manifest table. */
export const GITHUB_MANIFEST_PATH = '/blob/main/data/manifest.json'

/** Date every source of the manifest was collected (same date as the open-data zip and the 2026 collection). */
export const COLLECTION_DATE = '26/10/2026'