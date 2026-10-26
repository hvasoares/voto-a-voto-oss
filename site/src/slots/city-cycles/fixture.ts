/**
 * Fixture state of this slot = what the Sketch frame "9 Três ciclos (cidade)" shows.
 * - Screenshot route: /rj/cidade-exemplo/tres-ciclos/ (built from the fixture dataset, see site/README.md).
 * - `frameTexts` holds every text of the frame verbatim (extracted from Sketch), with position.
 *   Aggregate screens use it via ?fixture=sketch (ctx.useFrameFixture) when the small fixture
 *   dataset cannot produce the frame's national/state figures. City-level screens read the dataset instead:
 *   the fixture city "Cidade Exemplo" reproduces the frame's numbers exactly.
 */
import frame from '../../../reference/09-tres-ciclos-cidade.texts.json'

export const frameTexts: { x: number; y: number; w: number; h: number; text: string }[] = frame.texts
export const fixtureRoute = '/rj/cidade-exemplo/tres-ciclos/'
