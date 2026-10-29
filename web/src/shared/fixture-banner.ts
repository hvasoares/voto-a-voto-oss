import '@/lib/sentences/catalog-shell'
import { message } from '@/lib/sentences/catalog'

/**
 * The words of the fixture banner (ticket #136), from the sentence catalog (`shell.fixtureBanner`): "EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS".
 * `wideSeparator` puts two spaces around the dot ("EXEMPLO  ·  DADOS ..."), the way the screen pages (city card, three-cycles page, fact record)
 * have always written it; the rendered bytes are kept, so a page that wrote it narrow or wide still does.
 */
export function fixtureBannerText(wideSeparator = false): string {
  const text = message({ locale: 'pt-BR', register: 'standard' }, 'shell.fixtureBanner')
  return wideSeparator ? text.replace(' · ', '  ·  ') : text
}
