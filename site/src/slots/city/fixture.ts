/**
 * Fixture state of this slot = what the Sketch frame "2 Cartão da cidade" shows.
 * - Screenshot route: /rj/cidade-exemplo/?turno=1 (built from the fixture dataset, see site/README.md). The frame draws
 *   round 1; without the query the card shows the default for real data, the latest cycle and its latest round.
 * - `frameTexts` holds every text of the frame verbatim (extracted from Sketch), with position.
 *   City-level screens read the dataset instead: the fixture city "Cidade Exemplo" reproduces the frame's numbers exactly.
 */
import frame from '../../../reference/02-cartao-da-cidade.texts.json'

export const frameTexts: { x: number; y: number; w: number; h: number; text: string }[] = frame.texts
export const fixtureRoute = '/rj/cidade-exemplo/?turno=1'
