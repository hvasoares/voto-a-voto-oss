import { SHARD_VERSION } from 'virtual:data-shards'
import words from 'virtual:fact-words'
import { bootPageData } from '@/lib/page-data-boot'
import { drawFactPage } from '@/lib/fact-page-draw'
import { bindWayBack } from '@/lib/facts/way-back'
import { readRegister } from '@/lib/sentences/register-store'
import type { FactPageRecord } from '@/lib/facts/page-record'

/**
 * The calculation page (private#214): the stub loads `data/v<fingerprint>/fato/<scope>/<page>.json` and draws the records from it. A register chosen before the
 * card became plain-only is still honoured (set before the draw, so a sentence does not change under the reader), and the stub's link back is the way back of #152.
 */
if (readRegister() === 'plain') document.documentElement.dataset.register = 'plain'
bindWayBack()
const back = document.querySelector('a[data-stub-back]')
back?.classList.add('back')
void bootPageData<FactPageRecord>({ family: 'fato', version: SHARD_VERSION, draw: drawFactPage(words) })
