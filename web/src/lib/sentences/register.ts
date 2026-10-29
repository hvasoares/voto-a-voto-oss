/** The registers a sentence can be told in. Kept apart from the catalog so the card's script can use them without shipping the wording. */
export type Register = 'standard' | 'plain'
export const REGISTERS: readonly Register[] = ['standard', 'plain']
export { DEFAULT_REGISTER } from './voice'
