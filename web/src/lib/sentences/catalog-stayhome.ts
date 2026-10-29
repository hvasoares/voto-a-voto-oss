/**
 * The sentences of "Ficaram em casa" (#32), kept out of `catalog.ts` so the browser code every page loads does not carry them: only the
 * modules of that map import this file, and importing it registers the sentences in `CATALOG`. Same rules as the catalog: data, templates
 * with `{name}` slots, both registers, reviewed like code.
 *
 * Wording rule of this screen: the map shows ONE thing, the share of the electorate that did not vote for anyone, by state, in the chosen cycle
 * and round. No candidate, no cause, no effect. The only comparison with the margin is the one the measure note supports (docs/nonvoters-vs-margin.md):
 * per cycle and round, with that selection's own number, and with what it does not say.
 */
import { registerSentences, type Key } from './catalog'

export const STAYHOME_KEYS = [
  'stayhome.title',
  'stayhome.tab',
  'stayhome.sub',
  'stayhome.turno.1',
  'stayhome.turno.2',
  'stayhome.views.label',
  'stayhome.view',
  'stayhome.legend',
  'stayhome.legend.scale',
  'stayhome.legend.size',
  'stayhome.legend.map',
  'stayhome.selected',
  'stayhome.selected.line1',
  'stayhome.selected.line2',
  'stayhome.open',
  'stayhome.cell.label',
  'stayhome.table',
  'stayhome.table.uf',
  'stayhome.table.aptos',
  'stayhome.table.share',
  'stayhome.claim',
  'stayhome.claim.limits',
  'stayhome.noData',
  'stayhome.alt',
  'stayhome.alt.part',
  'stayhome.share',
  'stayhome.share.text',
  'stayhome.card.base',
  'stayhome.card.legend',
  'stayhome.failed',
  'stayhome.nojs',
] as const satisfies readonly Key[]

// The string-index half keeps stayhome.test.ts's `STAYHOME_STANDARD[k]` lookup compiling; the first half keeps a missing key
// of STAYHOME_KEYS a compile error here.
export const STAYHOME_STANDARD: Record<(typeof STAYHOME_KEYS)[number], string> & Record<string, string> = {
  'stayhome.title': 'Ficaram em casa',
  'stayhome.tab': 'Ficaram em casa',
  'stayhome.sub': 'Quem não votou em ninguém (abstenção, brancos e nulos). {turno} de {ano}.',
  'stayhome.turno.1': '1º turno',
  'stayhome.turno.2': '2º turno',
  'stayhome.views.label': 'Ciclo e turno',
  'stayhome.view': '{ano} · {turno}',
  'stayhome.legend': 'Parcela dos eleitores que não votou em ninguém. O valor está impresso em cada estado: a cor nunca é a única pista.',
  'stayhome.legend.scale': 'Escala, da esquerda para a direita, em porcentagem: {edges}.',
  'stayhome.legend.size': 'Tamanho igual para todos os estados. Toque num estado para ver os totais.',
  'stayhome.legend.map': 'O mapa mostra área, não eleitores. O mosaico é a visão padrão.',
  'stayhome.selected': '{uf} · selecionado',
  'stayhome.selected.line1': 'Eleitores aptos: {aptos} · não votaram: {nao}',
  'stayhome.selected.line2': 'Abstenção, brancos e nulos somados. Exterior não aparece como estado.',
  'stayhome.open': 'Abrir estado',
  'stayhome.cell.label': '{place}: {pct}% do eleitorado não votou em ninguém; {nao} de {aptos} eleitores aptos',
  'stayhome.table': 'Tabela por estado',
  'stayhome.table.uf': 'Estado',
  'stayhome.table.aptos': 'Eleitores aptos',
  'stayhome.table.share': 'Não votaram (%)',
  'stayhome.claim': 'Em {pct}% das cidades, o número de pessoas que não votaram em ninguém foi maior do que a diferença de votos entre os dois primeiros ({turno} de {ano}).',
  'stayhome.claim.limits': 'A conta compara dois números da mesma cidade. Não diz quem são essas pessoas, em quem votariam, nem que o resultado teria sido outro.',
  'stayhome.noData': 'Não há dados do {turno} de {ano} neste conjunto.',
  'stayhome.alt': 'Parcela dos eleitores que não votou em ninguém, por estado, {turno} de {ano}: {parts}.',
  'stayhome.alt.part': '{uf} {pct}%',
  'stayhome.share': 'Compartilhar o mapa',
  'stayhome.share.text': 'Parcela dos eleitores que não votou em ninguém (abstenção, brancos e nulos), por estado, {turno} de {ano}.',
  'stayhome.card.base': 'Cada estado mostra a parcela do seu eleitorado que não votou em ninguém: abstenção, brancos e nulos somados. O exterior não aparece como estado.',
  'stayhome.card.legend': 'Escala em %: {edges}',
  'stayhome.failed': 'O mapa não está disponível agora. A tabela por estado funciona sem ele.',
  'stayhome.nojs': 'A vista de mapa e o compartilhamento precisam de JavaScript. O mosaico acima funciona sem.',
}

export const STAYHOME_PLAIN: Record<(typeof STAYHOME_KEYS)[number], string> & Record<string, string> = {
  'stayhome.title': 'Ficaram em casa',
  'stayhome.tab': 'Ficaram em casa',
  'stayhome.sub': 'Quem não votou em ninguém: faltou, votou em branco ou anulou. {turno} de {ano}.',
  'stayhome.turno.1': '1º turno',
  'stayhome.turno.2': '2º turno',
  'stayhome.views.label': 'Ano e turno',
  'stayhome.view': '{ano} · {turno}',
  'stayhome.legend': 'Parte dos eleitores que não votou em ninguém. O número está escrito em cada estado. A cor não é a única pista.',
  'stayhome.legend.scale': 'Escala, da esquerda para a direita, em porcentagem: {edges}.',
  'stayhome.legend.size': 'Todos os estados têm o mesmo tamanho. Toque num estado para ver os totais.',
  'stayhome.legend.map': 'O mapa mostra a área do estado, não o número de eleitores. O mosaico é a visão padrão.',
  'stayhome.selected': '{uf} · selecionado',
  'stayhome.selected.line1': 'Eleitores que podiam votar: {aptos}. Não votaram: {nao}.',
  'stayhome.selected.line2': 'Soma de quem faltou, votou em branco ou anulou. O exterior não aparece como estado.',
  'stayhome.open': 'Abrir estado',
  'stayhome.cell.label': '{place}: {pct}% dos eleitores não votaram em ninguém; {nao} de {aptos} pessoas que podiam votar',
  'stayhome.table': 'Tabela por estado',
  'stayhome.table.uf': 'Estado',
  'stayhome.table.aptos': 'Eleitores que podiam votar',
  'stayhome.table.share': 'Não votaram (%)',
  'stayhome.claim': 'Em {pct}% das cidades, o número de pessoas que não votaram em ninguém foi maior que a diferença de votos entre os dois primeiros ({turno} de {ano}).',
  'stayhome.claim.limits': 'A conta compara dois números da mesma cidade. Ela não diz quem são essas pessoas. Não diz em quem votariam. Não diz que o resultado seria outro.',
  'stayhome.noData': 'Não há dados do {turno} de {ano} aqui.',
  'stayhome.alt': 'Parte dos eleitores que não votou em ninguém, por estado, {turno} de {ano}: {parts}.',
  'stayhome.alt.part': '{uf} {pct}%',
  'stayhome.share': 'Compartilhar o mapa',
  'stayhome.share.text': 'Parte dos eleitores que não votou em ninguém (faltou, votou em branco ou anulou), por estado, {turno} de {ano}.',
  'stayhome.card.base': 'Cada estado mostra a parte dos seus eleitores que não votou em ninguém: faltou, votou em branco ou anulou. O exterior não aparece como estado.',
  'stayhome.card.legend': 'Escala em %: {edges}',
  'stayhome.failed': 'O mapa não está disponível agora. A tabela por estado funciona sem ele.',
  'stayhome.nojs': 'A vista de mapa e o compartilhamento precisam de JavaScript. O mosaico acima funciona sem.',
}

registerSentences('pt-BR', 'standard', STAYHOME_STANDARD)
registerSentences('pt-BR', 'plain', STAYHOME_PLAIN)
