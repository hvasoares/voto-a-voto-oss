/** `npm run slots`: one line per slot (hydrated or "not yet hydrated"), with ticket and route. */
import { slots } from '../src/slots/registry'

const pad = (s: string, n: number) => s.padEnd(n)
console.log(`${pad('slot', 18)}${pad('ticket', 8)}${pad('state', 20)}route`)
for (const s of slots) console.log(`${pad(s.meta.id, 18)}${pad('#' + s.meta.ticket, 8)}${pad(s.hydrated ? 'hydrated' : 'not yet hydrated', 20)}${s.meta.route}`)
console.log(`\n${slots.filter((s) => s.hydrated).length}/${slots.length} hydrated`)
