/**
 * The hint above the Home search (#147), registered in the catalog in both registers. The words are data in `catalog-home.ts`
 * (the Home script reads them without loading the catalog); this module is what puts the same keys under the catalog's rules.
 */
import { registerSentences } from './catalog'
import { HOME_HINT_PLAIN, HOME_HINT_STANDARD } from './catalog-home'

registerSentences('pt-BR', 'standard', HOME_HINT_STANDARD)
registerSentences('pt-BR', 'plain', HOME_HINT_PLAIN)
