/**
 * The sentences of the live overlay (#68) and its builder, kept out of `catalog.ts` like `catalog-duel.ts`: only the overlay modules import this file, and importing it
 * registers the sentences in `CATALOG`. Same rules as the catalog: data, templates with `{name}` slots, both registers, reviewed like code.
 *
 * Wording rule: the overlay shows ONE number and ONE sentence that reads it, and the source line, which cannot be turned off. No cause, no winner label, final data.
 */
import { CATALOG } from './catalog'

export const OVERLAY_STANDARD: Record<string, string> = {
  'overlay.m.nv': 'Quem não votou',
  'overlay.m.margem': 'Margem em votos',
  'overlay.m.comparecimento': 'Comparecimento',
  'overlay.m.resultado': 'Resultado do 2º turno',
  'overlay.s.nv': 'dos eleitores de {city} não votaram no {turno}º turno de {ano}.',
  'overlay.s.margem': 'votos separaram os dois primeiros em {city} no {turno}º turno de {ano}.',
  'overlay.s.comparecimento': 'dos eleitores de {city} compareceram no {turno}º turno de {ano}.',
  'overlay.s.resultado': 'dos votos válidos em {city} foram de {name} no {turno}º turno de {ano}; {other} teve {pother}.',
  'overlay.nodata': 'Sem dados de {city} no {turno}º turno de {ano}.',
  'overlay.seal': 'TSE · dados finais · edição {edition} · {address}',
  'overlay.seal.fixture': 'EXEMPLO · dados fictícios, fonte real: TSE · edição {edition} · {address}',
  'overlay.invalid': 'Overlay sem cidade: confira o endereço.',
  'overlay.loading': 'Carregando…',
  'overlay.failed': 'Não foi possível carregar os dados da cidade.',
  'overlay.title': 'Overlay para live',
  'overlay.sub': 'Um endereço para a fonte de navegador do OBS: um número grande, com a fonte sempre visível.',
  'overlay.place': 'Lugar',
  'overlay.measure': 'Medida',
  'overlay.cycle': 'Ciclo',
  'overlay.size': 'Tamanho',
  'overlay.size.1920x1080': '1920×1080',
  'overlay.size.1280x720': '1280×720',
  'overlay.size.600x200': 'Faixa 600×200',
  'overlay.bg': 'Fundo',
  'overlay.bg.transparente': 'Transparente',
  'overlay.bg.escuro': 'Escuro',
  'overlay.bg.claro': 'Claro',
  'overlay.seal.on': 'Mostrar a fonte e a edição: sempre ligado',
  'overlay.seal.why': 'Não dá para desligar: uma captura de tela sempre leva a fonte.',
  'overlay.preview': 'Prévia · fundo transparente (o xadrez não aparece na transmissão)',
  'overlay.preview.other': 'Prévia',
  'overlay.preview.empty': 'Escolha uma cidade para ver a prévia.',
  'overlay.address': 'Endereço para o OBS',
  'overlay.copy': 'Copiar',
  'overlay.copied': 'Endereço copiado.',
  'overlay.copy.failed': 'A cópia não funcionou neste navegador. Selecione o endereço e copie.',
  'overlay.steps.title': 'No OBS',
  'overlay.steps.1': 'Em Fontes, clique em + e escolha Navegador.',
  'overlay.steps.2': 'Cole o endereço acima em URL.',
  'overlay.steps.3': 'Use largura {w} e altura {h}.',
  'overlay.steps.4': 'Deixe o campo de CSS personalizado como está: o fundo transparente já vem do endereço.',
  'overlay.static': 'Página estática: sem login, sem análise de uso, sem atualização ao vivo. Dados finais do TSE.',
}

export const OVERLAY_PLAIN: Record<string, string> = {
  ...OVERLAY_STANDARD,
  'overlay.s.resultado': 'dos votos válidos em {city} foram de {name} no {turno}º turno de {ano}. {other} teve {pother}.',
  'overlay.sub': 'Um endereço para a fonte de navegador do OBS: um número grande e a fonte sempre à vista.',
}

Object.assign(CATALOG['pt-BR'].standard, OVERLAY_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, OVERLAY_PLAIN)
