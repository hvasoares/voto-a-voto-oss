---
title: Launch gate (ticket #21)
description: O gate de lançamento medido de ponta a ponta — rotas, números, rede, tamanho e riscos.
---

# Launch gate (ticket #21)

O gate medido neste documento, com a data e o comando de cada medida. Nada aqui é estimativa: cada
número tem o comando que o produziu (todos dentro de `web/`, em Node v24.16.0, macOS). As medidas de
**build limpo** vêm de um clone recém-feito de um repositório (sem `node_modules`, sem `dist`),
enquanto o deploy do Pages segue bloqueado (abaixo) — é a mesma saída que `npm run build` teria num
pipeline de CI. Datas das medidas: 26–27/10/2026.

## Como rodar o gate

| Passo | Comando (dentro de `web/`) |
|---|---|
| smoke + números nas telas | `npm run test:real` (o projeto `real` roda os suites de dados reais) |
| shards do dataset | `npm run check:shards:real` |
| tipos e unitários | `npm run typecheck` e `npm test` |
| números ao vivo | `npm run check:tse-live` (precisa de rede; registra `docs/launch-gate/tse-live-verification.json`) |

## 1. Toda rota abre (criterio 1)

**Gate de cobertura total, sem HTTP (e2e/real-data-smoke.spec.ts, "full coverage"):** um passeio no
`dist/` do build real coleta TODO `index.html` — **23.137 rotas com `index.html`** — e exige para
cada uma que o arquivo exista, tenha mais de 500 bytes e o casco HTML completo (`</html>`). Rodado
em 27/10/2026 no `npm run test:real` final — que encerrou **87 testes passados, 0 falhados (5 min)**
(os 70 de dados reais que já existiam + 17 novos deste gate; os unitários 503 e os e2e de celular
176 passados/5 pulados seguem verdes; `npm run typecheck` sem erro).

**Amostra determinística por HTTP (o mesmo spec):** 130 rotas — a home, `/brasil/`,
`/sobre-os-dados/`, os 2 `/comparar/*`, os 7 `/relatorios/*`, hub + `/mapa/virada/` + TODOS os 27
`/mapa/<uf>`, TODOS os 27 `/<uf>`, TODAS as 27 UFs com 2 cidades (o primeiro e o último slug em ordem
alfabética), as sub-rotas `qr/`, `compartilhar/` e `tres-ciclos/` de uma cidade, e as duas demos
(`/qr/`, `/compartilhar/`). Para cada rota: **HTTP 200, nenhum `pageerror`, nenhum erro de console**. (O crawl HTTP das 23 mil
páginas foi deliberadamente substituído por este par de portões: o cheque de sistema de arquivos
prova que o arquivo existe; a amostra prova que ele é SERVIDO — um 404 só pode vir do servidor/Pages,
cujo comportamento o espelho de servir já reproduz.)

## 2. Números contra o TSE (criterio 2)

Dois elos, cada um com registro:

**(a) O dataset contra o site do TSE AO VIVO** — `npm run check:tse-live`
(`web/scripts/verify-tse-live.ts`): baixa os mesmos arquivos `.jws` assinados do portal oficial
(`https://resultados.tse.jus.br/oficial/ele2026`, arquivos nacionais + os municípios da amostra) e
compara figura a figura com `data/turnout.csv`, `data/votes.csv` e `data/manifest.json`. Executado em
**2026-10-27T06:17:50Z: 44 figuras iguais, 0 divergentes** (registro completo em
`docs/launch-gate/tse-live-verification.json`). A amostra: os arquivos nacionais dos dois turnos +
São Paulo, Rio de Janeiro, Brasília, Salvador, Marquinho, Itabirito e Campos dos Goytacazes (ambos
os turnos de São Paulo e Marquinho).

**(b) As telas contra o dataset** — `e2e/real-data-launch-gate.spec.ts`: **38 figuras em 14 telas**
(nacional, regional, tiles de estado, cartões de cidade, relatórios), cada valor com a fonte citada
na asserção; registro em `.captures/launch-gate/verified-numbers.json`. Destaques:

| Tela | Figura confere com | Fonte |
|---|---|---|
| `/brasil/` | Lula 64.256.232 · 51,79% · Flavio 59.826.041 | `data/manifest.json` national_reference (TSE) + LIVE |
| `/mapa/` | SP: 26.258.452 votos válidos; tile `-7,7 pp` (antes -13,7) | CSVs + pin de `margins.test.ts` |
| `/mapa/virada/` | RJ +7,4 / AL +7,3 / SE +6,9 / MG +5,8 pp | nota de destaques do TSE |
| `/comparar/2022/` | SP 26.258.452 válidos; Lula +599.392 votos | CSVs; documentado em `compare.ts` |
| `/sp/sao-paulo/` | Lula 3.864.354 · Flavio 3.097.923 · Brancos 104.890 · Nulos 216.904 | CSVs + LIVE + plano das fontes |
| `/df/brasilia/` | Lula 825.224 · Flavio 979.542 | CSVs + LIVE |
| `/rj/rio-de-janeiro/` | Lula 1.898.391 · Flavio 1.785.198 | CSVs + LIVE |
| relatórios | `Lula virou 211 cidades`; Itabirito `-4,5 → +5,0 pp`; Campos `+9,8 pp`; `+3.862.039`; SP `+186.433`; empate 1.530 a 1.530; comparecimento 90,5% / 59,0% | nota de destaques + CSVs (+ LIVE no empate) |

Ponteiro para as fontes do TSE: `data/manifest.json` ("sources") traz a URL, byte count, SHA-256 e
data de coleta de cada arquivo — zips abertos em
`https://cdn.tse.jus.br/estatistica/sead/odsele/...` e o portal de resultados
`https://resultados.tse.jus.br/oficial/ele2026` (11.516 arquivos finais, digest `62db05bd…`).

## 3. Frontend confirmado (criterio 3)

O mesmo smoke spec leva a **rede de todas as 130 rotas** da amostra: **920 pedidos** (130 documentos,
130 stylesheets, 658 scripts, 2 imagens; a lista por rota em
`.captures/launch-gate/network-trace.json`) e exige para cada um **GET no próprio origin do site** —
nenhum outro origin pode aparecer nem uma vez. Neste build não há id de analytics configurado e
`cdn.config.json` está vazio, então a lista de origins permitidos é exatamente `[site]` (o próprio
teste fixa isso em uma asserção; os canaries de `network.spec.ts` mostram que o detector acha
pedidos de fora e não-GET).

## 4. Tamanho publicado e tempo de build (criterio 4)

Build idêntico ao de produção (mesmos dados, mesma máquina), medido num clone limpo em
`/tmp` (**27/10/2026**):

```
git clone -b issue-21 <worktree> /tmp/vav-launchgate/clean
cd clean/web && npm ci --no-audit --no-fund            # concluído, exit 0
/usr/bin/time -l env DATA_DIR=../data npm run build    # abaixo
```

| Medida | Build limpo | Build de referência (worktree) |
|---|---|---|
| Tempo total de build (`/usr/bin/time -l` real) | **207,5 s (3 min 28 s)** | ~3 min 45 s (tempo de parede 03:07:29→03:10:28; log do worktree: `23138 page(s) built in 3m 24s`) |
| Pico de RSS (`maximum resident set size`) | **2.308.292.608 B (~2,31 GB)** | — |
| `dist/` total (`du -sk dist`) | **702,8 MB (719.616 KB)** | 702,5 MB (719.328 KB) — Δ ~0,3 MB |
| Páginas (`find dist -name index.html`) | **23.137** | 23.137 (idêntico) |
| Log do Astro | `23138 page(s) built in 3m 25s` | `23138 page(s) built in 3m 24s` |
| Destaques do `du` por diretório (KB) | preview 116.184 · mg 84.452 · sp 63.464 · data 23.608 | preview 116.184 · mg 84.452 · sp 63.464 · data 23.608 (idênticos) |

Os dois builds batem (mesmo número de páginas, mesmo `du` por diretório, dist total com Δ ~0,05%).
A saída do `/usr/bin/time -l` do build limpo (transcrita acima): `207.52 real`, `maximum resident set
size 2308292608`. O `du` completo dos dois está em `.captures/launch-gate/dist-du-worktree.txt` e
`dist-du-clean-clone.txt`.

### ABERTO — deploy para o GitHub Pages ainda bloqueado (plano da conta)

O Pages API recusa (`422`) porque o repositório é **privado numa conta cujo plano não inclui Pages**
(registrado pela orquestração antes deste ticket; um `gh api repos/…/pages` devolve 404 hoje — site
nenhum configurado). A verificação "deploy de um clone limpo funciona" fica **ABERTA** até o plano
ser liberado; o comando equivalente (a rodar quando estiver):

```
gh api repos/hvasoares/voto-a-voto/pages -X POST \
  -f "source[branch]"=gh-pages -f "source[path]"=web/dist
```

Tamanho não é o bloqueio: o guideline do Pages é ~1 GB por site e o build é ~0,7 GB (acima), dentro
dele — mas o deploy de verdade só quando o plano abrir.

## 5. Riscos do relatório do forge (criterio 5)

Fonte: `thoughts/shared/forge/election-spa/forged-idea.md`
(`centraleleicao2026/thoughts/shared/forge/election-spa/`), seção "Still unchecked" + as decisões que
carregam risco:

| Risco | Estado | Uma linha |
|---|---|---|
| NOME/colunas do arquivo de detalhe do TSE; brancos/nulos de 2026; crosswalk TSE→IBGE (falhas de dados) | **FECHADO** | O dataset veio com tudo: manifest traz os 4 zips + o portal de resultados com hash, `cities.csv` carrega o `cd_ibge`, brancos/nulos/abstencões do arquivo 2026 fecham município a município (identity testada; `make data-check` revalida sem rede; o coletor só aceita resultado `final`), cruzamentos verificados município a município (suites de dados reais de mapa e relatórios). |
| O compartilhamento com imagem + link sobrevive na folha de compartilhamento dos celulares alvo | **ABERTO** | Precisa de aparelho físico — a automação só cobre o fallback "Baixar imagem"; teste do #7 (1 iPhone + 2 Androids) continua por fazer, fora do alcance deste ticket. |
| Licenciamento e redação neutra numa eleição disputada | **FECHADO** | O site não usa marca do TSE além de citar a fonte, e `/sobre-os-dados/` declara "Não há pesquisa própria, estimativa ou fonte de terceiros.", mostra método, limites e o "Confira você mesmo" com o manifesto e os hashes. |
| Risco de single-launch — um bloqueio de dados trava tudo | **FECHADO** | Os dados de 2026 chegaram finalizados (11.516 arquivos finais, 26/10) e cada risco virou um cheque automatizado e separado neste gate (os 4 criterios aqui); um bloqueio novo aparece como gate vermelho, não como launch quebrado. |
| Tamanho das imagens de compartilhamento vs. guideline do Pages | **FECHADO (medido)** | `preview/` = 113,5 MB de imagens, dist total 0,7 GB < ~1 GB do guideline (criterio 4); por ciclo/round nunca foi feito, como o forge decidiu. |
| v1 sai sem o relatório da janela de extensão de horário | **ACEITO** | Decisão do forge; o site declara o gap em `/sobre-os-dados/` ("não entra nesta versão (v1)… nada aqui diz quando uma seção abriu atrasada ou fechou depois do horário"). |

## 6. Itens ABERTOS fora do alcance das automações (para o usuário)

1. **Plano do GitHub Pages** — liberar Pages no repositório (hoje 422/404; ver criterio 4).
2. **Teste de compartilhamento em aparelhos físicos** — 1 iPhone + 2 Androids (imagem + link), do #7.
3. **Texto do Sketch (telas 8, 9 e 13)** — do próprio #21; o texto novo não é deste repositório.
4. **GA4 real no celular** — colocar o `PUBLIC_GA_MEASUREMENT_ID` real no ambiente de deploy e
   verificar uma vez no GA4 realtime num celular (os suites só exercitam um id FALSO fixo / ausente).
5. **Re-rodar `npm run check:tse-live` perto do deploy** — a verificação ao vivo é do dia; um TSE
   republicado depois muda os hashes (o manifest registra quando).