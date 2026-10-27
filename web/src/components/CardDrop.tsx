import { useRef, useState } from 'react'
import { SHARD_VERSION } from 'virtual:data-shards'
import { Button } from '@/components/ui/button'
import { withBase } from '@/paths'
import { reopenFile, type Outcome, type ReopenContext } from '@/lib/card-reopen'
import type { CityShard } from '@/lib/city-shard'

/**
 * Drop a card file on the site (#38): the SVG or the PNG of a card reopens its view, recomputed from this site's data. The file is
 * read as bytes in this browser, its keys are checked (`card-reopen.ts`) and what is shown is ALWAYS the card the site draws
 * again: the dropped file is never put into the page. The only request is the shard of the city the keys name.
 */
export interface CardDropProps {
  base: string
  origin: string
  fixture: boolean
  /** The id of the edition this build shows. */
  edition: string
}

const WHY: Record<string, string> = {
  empty: 'O arquivo está vazio.',
  'too-big': 'O arquivo é grande demais para ser um cartão.',
  script: 'O arquivo contém um script e não foi aberto.',
  'not-svg': 'O arquivo não é um SVG nem um PNG de cartão.',
}
const MESSAGE = (o: Outcome, current: string): string => {
  switch (o.status) {
    case 'ok':
      return `O cartão confere com os dados do site (edição ${current}).`
    case 'altered':
      return 'O arquivo foi alterado ou não confere com os dados do site. Abaixo está o cartão refeito a partir dos dados.'
    case 'other-edition':
      return `Este cartão é da edição ${o.keys.edition}. Abaixo estão os números da edição atual (${current}).`
    case 'no-keys':
      return o.reason === 'png' ? 'Esta imagem não traz as chaves do cartão (aplicativos de mensagem costumam removê-las). Use o endereço impresso nela.' : 'Este SVG não é um cartão do Voto a Voto.'
    case 'mismatch':
      return 'As chaves do arquivo não correspondem a nenhum cartão do site.'
    case 'unsupported':
      return 'Este tipo de cartão ainda não pode ser reaberto aqui.'
    default:
      return `Não foi possível ler o arquivo. ${WHY[o.reason] ?? ''}`.trim()
  }
}

export default function CardDrop({ base, origin, fixture, edition }: CardDropProps) {
  const [outcome, setOutcome] = useState<Outcome>()
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const ctx: ReopenContext = {
    edition,
    origin,
    base,
    fixture,
    loadShard: async (uf, slug) => {
      const res = await fetch(withBase(base, `data/v${SHARD_VERSION}/city/${uf}/${slug}.json`))
      return res.ok ? ((await res.json()) as CityShard) : undefined
    },
  }
  const open = async (file: File | undefined) => {
    if (!file) return
    // Refuse before reading: a card is a few KB.
    if (file.size > 2_000_000) return setOutcome({ status: 'unreadable', reason: 'too-big' })
    setOutcome(await reopenFile(new Uint8Array(await file.arrayBuffer()), ctx).catch(() => ({ status: 'unreadable', reason: 'not-svg' }) as Outcome))
  }

  return (
    <div data-card-drop>
      <div
        className={`mt-3 rounded-md border-2 border-dashed px-4 py-8 text-center ${over ? 'border-primary bg-secondary' : 'border-border'}`}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void open(e.dataTransfer.files[0])
        }}
        data-drop-zone
      >
        <p className="text-body leading-[18px]">Solte aqui o SVG ou o PNG de um cartão</p>
        <Button className="mt-3 min-h-11 rounded-md px-4 text-body font-bold text-primary-foreground" onClick={() => input.current?.click()}>
          Escolher arquivo
        </Button>
        <input ref={input} type="file" accept=".svg,.png,image/svg+xml,image/png" className="sr-only" aria-label="Arquivo do cartão" data-file-input onChange={(e) => void open(e.currentTarget.files?.[0])} />
      </div>
      <div role="status" aria-live="polite" data-outcome={outcome?.status ?? 'none'}>
        {outcome && (
          <>
            <p className="mt-3 text-body leading-[18px]" data-message>{MESSAGE(outcome, edition)}</p>
            {'card' in outcome && (
              <>
                {/* The card the SITE drew again from its own data: safe markup made by our drawing functions, never the dropped file. */}
                <div className="mx-auto mt-3 max-w-[260px] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" data-recomputed dangerouslySetInnerHTML={{ __html: outcome.card.svg }} />
                <a className="mt-3 flex min-h-11 w-full items-center justify-center rounded-md border border-border text-body font-bold text-primary" href={outcome.card.href} data-open-view>
                  Abrir esta vista ›
                </a>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
