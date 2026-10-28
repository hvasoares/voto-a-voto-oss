import { getAnalytics } from '@/analytics'
import ShareActions from '@/components/ShareActions'

/**
 * The share actions of "Ficaram em casa" (#32): the existing share flow (`ShareActions`: the picture and the link through the system sheet, or the
 * download where there is none) with one primary action, and its counter `stayhome_shared` when the system sheet reports a completed share. The properties
 * are the cycle and the round, nothing else. (`stayhome_opened` is counted by the page script `scripts/stayhome-analytics.ts`, not here: this island loads
 * only when it scrolls into view.)
 */
export interface StayHomeShareProps {
  ano: number
  turno: number
  /** The message: the sentence of the view and the page address (scheme included). */
  text: string
  svg: string
  filename: string
  link: string
  label: string
}

export default function StayHomeShare({ ano, turno, text, svg, filename, link, label }: StayHomeShareProps) {
  const props = { ciclo: ano, turno }
  return <ShareActions text={text} svg={svg} filename={filename} link={link} primaryLabel={label} compact onShared={() => getAnalytics().event('stayhome_shared', props)} />
}
