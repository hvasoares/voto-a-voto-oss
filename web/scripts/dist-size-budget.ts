/**
 * The one budget of `check:dist-size` (private#204): the size of the whole built site, in bytes (decimal, 1 MB = 1e6 B).
 * Each later ticket of the lighter-site milestone lowers `DIST_BUDGET_BYTES` in its own commit, with the measured value
 * in that commit's message; nobody raises it without the owner.
 */

/**
 * Today's gate: the total of the last real-data build, 1.29 GB (private#197), taken from the ticket and not re-measured.
 * The fixture build (about 10 MB) passes it by a wide margin; the gate only bites on a real-data build until the tickets lower it.
 */
export const DIST_BUDGET_BYTES = 1_290_000_000

/**
 * The recommended final value, 900 MB. TO BE CONFIRMED BY THE OWNER: it is not the gate; it is only the line the
 * "editions of headroom" estimate is also printed against.
 */
export const RECOMMENDED_FINAL_BYTES = 900_000_000
