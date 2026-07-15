import type { ImsQuarter } from '@/types/domain'

export const ALL_IMS_QUARTERS: ImsQuarter[] = Array.from(
  { length: 16 },
  (_, i) => i + 1,
)

/** IMS Lehrjahr 1–4 from quarter 1–16 */
export function lehrjahrForQuarter(q: ImsQuarter): number {
  return Math.ceil(q / 4)
}

export function labelForQuarter(q: ImsQuarter): string {
  return `IMS Quartal ${q}`
}
