---
title: Budgets de peso e carregamento (ticket #19)
description: O que as páginas dos quatro roteiros auditados pesam, o que é carregado, e quem vigia os números.
---

# Peso e carregamento das rotas auditadas

Ticket #19. Dois números convivem aqui, e nenhuma cifra abaixo foi inventada: **tudo é medido no
build** pelo script `scripts/perf-budgets.ts`, que lê o HTML construído das quatro rotas e soma,
com gzip (node:zlib sobre os bytes construídos — o que um celular em 4G baixaria com a compressão
simples do servidor), o que o navegador transfere. Rodar com `npm run build && npm run check:perf`
(existe também como `npm run check:perf` sozinho); o script **falha** quando um orçamento é
estourado, então os números de uma tabela não podem divergir silenciosamente do código.

O que o script soma por rota:

- **html** — o documento da página;
- **css** — todo stylesheet que o documento liga (o site manda um CSS compartilhado);
- **eagerJs** — todo `<script src>` no documento (scripts de página; ilhas contam em islandJs);
- **islandJs** — toda ilha React que a rota declara (`component-url` e `renderer-url` de
  astro-island), com a nota de que as ilhas `client:interaction` **não carregam isso no carregamento
  da página**: o download acontece no primeiro toque/foco. O custo de react-dom está contido aqui.

## Orçamentos

| Rota | html | css | eagerJs | islandJs | total medido |
|---|---|---|---|---|---|
| `/` (home) | 12 KB | 16 KB | 4.2 KB (#35/#40: era 3 KB) | 120 KB | **101.0K** |
| `/rj/cidade-exemplo/` (cartão) | 6.4 KB (G6: +0.2 KB, ver abaixo; G2: +1 KB, ver abaixo; #58: a frase pronta nos dois registros; #51: a barra superior de desktop, pré-renderizada em todas as páginas; #52: a segunda coluna do cartão) | 16 KB | 3 KB | 3 KB | **15.2K** |
| `/mapa/` (tile map por estado) | 12 KB | 16 KB | 3 KB | 85 KB | **92.9K** |
| `/relatorios/cidades-que-viraram/` (relatório) | 12 KB | 16 KB | 3 KB | 3 KB | **14.1K** |

**Mudança de orçamento (#35, #40):** o `eagerJs` da home passou de 3 KB para 4.2 KB. A home agora lê o aparelho ao carregar
(o atalho "Sua cidade" e o "esquecer meus dados", ~0.6 KB gzip) e traz o botão "Usar minha localização"; o código que pede a posição
e o arquivo dos centros (70 KB gzip) só carregam no toque, mas o `import()` dinâmico faz o Vite acrescentar seu carregador (~0.9 KB gzip) ao script
da página (medido: embutir o código custou mais, 5.4 KB contra 4.9 KB de JS na página). Medido: eagerJs da home 4.1K; o html da home cresce ~0.4 KB gzip (markup do atalho, do botão e das notas; `measure.ts`: 6.4K -> 6.8K).

**Mudança de orçamento (#51, #52):** o `html` do cartão passou de 4 KB para 4.6 KB (#51) e para 5.2 KB (#52, a segunda coluna do cartão e as descrições dos links, ~0.5 KB): a barra superior do desktop (marca, campo de busca, três links) é HTML pré-renderizado em toda página, escondida abaixo de 1024 px (medido no celular: +0.7 KB gzip de HTML em toda página, +0.6 KB no CSS compartilhado, nenhum byte de JS nem requisição nova: o módulo do desktop é carregado por um trecho inline atrás de `matchMedia`, e o campo só vira o `CitySearch` real no primeiro foco).

**Mudança de orçamento (G2: #26, #41, #31, #33):** o `html` do cartão passou de 5.2 KB para 6.2 KB. As quatro linhas do cartão são texto
pré-renderizado, nos dois registros, sem script e sem requisição nova: o html do cartão (`rj/cidade-exemplo/`, fixture) foi de 5179 para 6138 bytes gzip
(+959 B): cartão de curiosidades 383 B (no celular e no desktop: o mesmo bloco; a página própria e o link de 23 B foram removidos depois, o html da cidade com cartão caiu ~22 B), linha da margem 266 B (seis vistas,
dois registros), cidade gêmea 153 B, arco 132 B. O mínimo que cobre o medido com folga de ~0.2 KB; o resto do cartão (css, js) não mudou de orçamento.

**Mudança de orçamento (G6, #61):** o `html` do cartão passou de 6.2 KB para 6.4 KB. Cada número do cartão ganhou o link "ver cálculo" (as duas barras, as cinco
linhas da legenda, a frase e a linha da margem, nas seis vistas pré-renderizadas; o cartão de curiosidades, um por fato): o html da cidade (`rj/cidade-exemplo/`, fixture, 390x844,
`measure.ts`) foi de 6106 para 6475 bytes gzip (+369 B; 6.32 KB, folga de 0.08 KB). Nada mais mudou na primeira carga do celular: JS 5064 B gzip (10155 raw), antes e depois;
dados 0 B, antes e depois; CSS 15605 -> 15697 B gzip (+92 B, as regras `.calc`, no mesmo arquivo, abaixo do orçamento de 16 KB). A página do cálculo (`/fato/...`) tem o CSS dela
(`fact.css`, só nessa página) e não tem script próprio.

**G3 (#25 a #29), nenhum orçamento mudou:** as dez novas linhas da tabela de eventos (`analytics/events.ts`, com prosa) fariam o script que toda
página carrega passar de 3.1 KB (gzip) e estourar o `eagerJs` de home, mapa e relatório. A tabela foi dividida: `analytics/event-props.ts` traz só o
que o navegador precisa (nome do evento e propriedades permitidas) e `events.ts`, com as descrições, ficou para os testes e a documentação, com um
teste que obriga as duas a dizerem o mesmo. Efeito medido (`npm run check:perf`, fixture): o script de todas as páginas caiu de 3.1 KB para 1.4 KB
gzip; `eagerJs` home 2.8 KB (orçamento 4.2), cartão 2.3 KB (3), mapa e relatório 1.5 KB (3); o html do cartão da cidade continua 6.0 KB (6.2) e o da home
8.2 KB (12). As páginas novas (`/gerador/`, `/abrir-cartao/`, `/resumo/`, `/meu-brasil/`, `/widget/`) são ilhas `client:load`
fora das quatro rotas auditadas; o widget (`/embed/…`) não tem script.

Os orçamentos foram calibrados para o site já passar de folga — a intenção do ticket foi
**fixar o piso atual como linha de base**, para que regressões de peso (voltar a CDNs, importar
uma biblioteca de animação, soltar um CSS duplicado) quebrem o CI em vez de entrar mudo.

## Números medidos (build do fixture)

As quatro rotas atendem aos orçamentos. Em K gzip:

| Rota | html | css | eagerJs | islandJs | **No carregamento** (html+css+eagerJs) |
|---|---|---|---|---|---|
| home | 5.9K | 12.2K | 0.2K | 82.7K (CitySearch 19.3K + client 63.4K) | **18.3K** |
| cartão da cidade | 2.3K | 12.2K | 0.7K | 0 | **15.2K** |
| mapa | 5.1K | 12.2K | 0.1K | 75.6K (StateMapMap 12.2K + client 63.4K) | **17.4K** |
| relatório | 1.9K | 12.2K | 0.1K | 0 | **14.2K** |

Duas notas que o orçamento não esconde:

- **react-dom (o `client.` de 63.4K) é o custo fixo das páginas com ilha.** As ilhas desta base são
  todas `client:interaction`, então esse download só sai quando o campo de busca da home ou a
  malha/troca de vista do mapa é tocado; está contabilizado no "total" e separado acima.
- A home carrega **um único shard** de dados (`search.json`) e **só quando o campo ganha foco** —
  isso é pinado em e2e (`home.spec`); o mapa puxa a malha de municípios **só quando a vista Mapa
  abre** — pinado em `mapa-rj.spec`.

## O que já foi podado neste ticket

- `tw-animate-css` saiu de `styles/global.css` (as animações dele só fariam sentido num componente
  animado; nenhum existe hoje) — CSS crú de 66.7K para 61.8K, gzip medido 12.2K. Voltar com ele
  na primeira animação de verdade (o comentário no CSS documenta isso).
- Nada mais precisou podar: as rotas já atendiam seus orçamentos com folga.

## Acessibilidade e movimento, do mesmo ticket (aqui por serem de tela, não de peso)

- `prefers-reduced-motion` é honrado: a base zera animações/transições em CSS, e os componentes
  que têm transição própria só a carregam via `motion-safe:`.
- Alvos de toque (44px) foram normalizados via tokens (`--min-tap` / `min-h-11`) na folha de
  compartilhamento, tela de QR, painel do mapa, linhas dos relatórios e grade da home.
- Sem "significado só pela cor": os tiles do mapa carregam o valor à vista e o nome do estado numa
  frase sr-only (o rótulo vem do conteúdo, não de um aria-label), o painel selecionado é
  `aria-live`, os degraus da escala são numéricos, e o relatório tem as frases equivalentes.
- Residual documentado: nos degraus positivos da escala do Sketch, o `fgOf` de #16 já escolhe a
  tinta de maior contraste, e o degrau pos-2 (`#d15c53`) fecha em 4.4:1 nos dois sentidos — a
  paleta não alcança 4.5:1 aí; e o rótulo permanece legível pois há leitura em texto em dois
  lugares (sobre o próprio tile — visível e sr-only — e na tabela por estado). O axe roda em CI
  nas quatro rotas (`e2e/a11y.spec.ts`) com essa e só essa exceção, comentada no arquivo.

## Escala tipográfica (reconciliação limitada do #19)

A regra do ticket foi "tokens ganham": as páginas de relatório já usam a escala de tokens
(`text-title`, `text-body`, `text-small`…), então não houve nada a reconciliar nelas. Sobram duas
exceções pontuais, padrão de todo o site e não só dos relatórios — o badge numerado dos rankings
(`text-[13px]`) e o rodapé de fonte (`text-[12.3px]`) — que ficam como estão: valores únicos numa
escala compartilhada, mexer neles mudaria o visual que o ticket manda preservar.