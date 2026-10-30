import { SHARD_VERSION } from 'virtual:data-shards'
import { bootPageData } from '@/lib/page-data-boot'
import { drawShareSheet } from '@/lib/share-sheet-draw'
import type { ShareSheetRecord } from '@/lib/share-sheet-record'

/** The city share sheet (private#210): the stub loads `data/v<fingerprint>/compartilhar/<uf>/<slug>.json` and draws the sheet from it. */
void bootPageData<ShareSheetRecord>({ family: 'compartilhar', version: SHARD_VERSION, draw: drawShareSheet })
