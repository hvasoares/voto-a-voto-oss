/**
 * The words of the region page (#183), PURE: the catalog's `region.*` filled from the numbers of the page. The count line says how many states and
 * municipalities the dataset has in the region; the row words say who is ahead in a state only as a read-aloud addition to the signed points.
 * Importing this file loads the sentences (`catalog-region.ts`).
 */
import { formatInt } from '@/shared/city-model'
import { message as say, type MessageKey } from './catalog'
import './catalog-region'
import { voiceOf, type VoiceInput } from './voice'

export interface RegionVoice extends VoiceInput {}
type Params = Record<string, string | number>

const regionSay = (voice: RegionVoice, key: string, params: Params = {}, count?: number): string => say(voiceOf(voice), key as MessageKey, params, count)

export const regionTitle = (name: string, voice: RegionVoice = {}) => regionSay(voice, 'region.title', { name })
export const regionCounts = (states: number, cities: number, voice: RegionVoice = {}) =>
  regionSay(voice, 'region.counts', { states: regionSay(voice, 'region.states', { n: formatInt(states) }, states), cities: regionSay(voice, 'region.cities', { n: formatInt(cities) }, cities) })
export const regionList = (name: string, voice: RegionVoice = {}) => regionSay(voice, 'region.list', { name })
export const regionAhead = (name: string, voice: RegionVoice = {}) => regionSay(voice, 'region.row.ahead', { name })
export const regionNerds = (voice: RegionVoice = {}) => regionSay(voice, 'region.nerds')
export const regionMore = (name: string, voice: RegionVoice = {}) => regionSay(voice, 'region.more', { name })
export const regionCompare = (voice: RegionVoice = {}) => regionSay(voice, 'region.compare')
export const regionDescription = (name: string, ano: number, voice: RegionVoice = {}) => regionSay(voice, 'region.description', { name, ano })
