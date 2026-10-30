/**
 * The one budget of `check:dist-size` (private#204): the size of the whole built site, in bytes (decimal, 1 MB = 1e6 B).
 * Each later ticket of the lighter-site milestone lowers `DIST_BUDGET_BYTES` in its own commit, with the measured value
 * in that commit's message; nobody raises it without the owner.
 */

/**
 * Today's gate (private#216): the total of the real-data build measured on 2026-10-29 after the stub families (private#208 to private#216), 794.9 MB,
 * plus a margin of about 5% = 835 MB. It was 890 MB after private#215 (847.2 MB measured, 77,574 files) and 1.29 GB (private#197, the ticket's figure)
 * before. The fixture build (about 8 MB) passes it by a wide margin; the gate only bites on a real-data build. Do not raise it without the owner.
 */
export const DIST_BUDGET_BYTES = 835_000_000

/**
 * The recommended final value, 900 MB. TO BE CONFIRMED BY THE OWNER: it is not the gate; it is only the line the
 * "editions of headroom" estimate is also printed against.
 */
export const RECOMMENDED_FINAL_BYTES = 900_000_000
