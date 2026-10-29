/** The registers a sentence can be told in. Kept apart from the catalog so the card's script can use them
 * without shipping the wording; the definitions live in the voice/defaults helper (`voice.ts`, #141) and
 * are re-exported here, so imports of `./register` keep working. */
export { DEFAULT_REGISTER, REGISTERS, type Register } from './voice'
