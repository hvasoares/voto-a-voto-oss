/** Number formatting of the dashboard (pt-BR). Pure; every printed figure goes through here so a test can recompute it. */
export const int = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** `82,3%`: one decimal, comma, rounded half away from zero; 0/0 has no percent. */
export function pct1(part: number, whole: number): string | null {
  if (whole === 0) return null
  const tenths = Math.round((part / whole) * 1000 + Number.EPSILON)
  return `${Math.floor(tenths / 10)},${tenths % 10}%`
}
