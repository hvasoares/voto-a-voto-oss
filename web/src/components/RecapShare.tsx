import { getAnalytics } from '@/analytics'
import ShareActions from '@/components/ShareActions'

/**
 * The share actions of the state recap (#28): the existing share flow (`ShareActions`: the picture and the link through the
 * system sheet, or the download where there is none) with the recap's label, one primary action, and its two counters:
 * `recap_opened` when the page's actions come up and `recap_shared` when the system sheet reports a completed share.
 */
export interface RecapShareProps {
  uf: string
  /** The message: the headline sentence and the page address (scheme included). */
  text: string
  svg: string
  filename: string
  link: string
  label: string
}

export default function RecapShare({ uf, text, svg, filename, link, label }: RecapShareProps) {
  return (
    <ShareActions
      text={text}
      svg={svg}
      filename={filename}
      link={link}
      primaryLabel={label}
      compact
      onOpened={() => getAnalytics().event('recap_opened', { uf })}
      onShared={() => getAnalytics().event('recap_shared', { uf })}
    />
  )
}
