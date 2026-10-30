import { useEffect, useState } from 'react'
import { DEFAULT_VOICE, message } from '@/lib/sentences/catalog'
import '@/lib/sentences/catalog-texts'
import type { CityTexts } from '@/lib/city-texts-build'
import { CARD_REGISTER } from '@/lib/sentences/register'
import PlaceText from '@/components/PlaceText'

/**
 * "Textos prontos" (#65): the WhatsApp/SMS block and the read-aloud bulletin of a city, in plain language (the card's one text, #157), with a copy button each
 * where the browser can copy. The block of the share sheet's stub (private#210), drawn from the texts `cityTextsOf` builds from the data file; the copy
 * buttons are shown once the island runs and the status line says what happened. `except` keeps a city whose name holds a place word ("Santa Cruz do Sul") plain.
 */
interface CityTextsBlockProps {
  texts: CityTexts
  stateHref: string
  except?: readonly string[]
}

const say = (key: string) => message(DEFAULT_VOICE, key as never)
const BLOCKS = ['whatsapp', 'radio'] as const

export default function CityTextsBlock({ texts, stateHref, except = [] }: CityTextsBlockProps) {
  const [canCopy, setCanCopy] = useState(false)
  const [status, setStatus] = useState('')
  useEffect(() => setCanCopy(!!navigator.clipboard), [])
  const body = { whatsapp: texts.whatsapp[CARD_REGISTER], radio: texts.bulletin[CARD_REGISTER] }
  const title = { whatsapp: say('text.wa.title'), radio: say('text.radio.title') }
  const copy = (id: (typeof BLOCKS)[number]) =>
    void navigator.clipboard.writeText(body[id]).then(
      () => setStatus(say('text.copied')),
      () => setStatus(say('text.copy.failed')),
    )
  return (
    <section className="mt-3 border-t border-border pt-3" data-city-texts aria-labelledby="textos-prontos">
      <h2 id="textos-prontos" className="font-serif text-step-3">{say('text.section.title')}</h2>
      <p className="mt-1 text-step-1 text-muted-foreground">{say('text.section.note')}</p>
      {BLOCKS.map((id) => (
        <div className="mt-3" data-text-block={id} key={id}>
          <h3 className="text-step-2 font-bold">{title[id]}</h3>
          {id === 'radio' && <p className="text-step-1 text-muted-foreground">{say('text.radio.note')}</p>}
          <p className="mt-1 whitespace-pre-line rounded-md border border-border bg-[var(--c-paper-2)] p-3 text-step-2 wrap-anywhere" data-text={id}>
            <PlaceText text={body[id]} except={except} />
          </p>
          <button type="button" className="mt-2 min-h-11 w-full rounded-md border border-border bg-background text-step-2 font-bold text-foreground" data-copy={id} hidden={!canCopy} onClick={() => copy(id)}>
            {say('text.copy')}
          </button>
        </div>
      ))}
      <p className="min-h-6 text-step-1 text-muted-foreground" role="status" aria-live="polite" data-copy-status>{status}</p>
      <a className="mt-1 flex min-h-11 items-center text-step-2 font-bold text-primary" href={stateHref} data-state-texts>{say('text.state.link')}</a>
    </section>
  )
}
