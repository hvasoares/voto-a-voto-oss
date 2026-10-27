# Voto a Voto: resultados por município, edição 2026-10-20

Resultados da eleição presidencial de 2018, 2022 e 2026 por município, normalizados e conferidos, na edição de 2026-10-20 (id `2026-10-20`).
Endereço permanente: https://voto-a-voto.com/edicoes/2026-10-20/dados/

## Arquivos

| Arquivo | O que tem | Linhas |
|---|---|---|
| `cities.csv`, `cities.ndjson` | um município (ou posto no exterior) por linha | 9 |
| `turnout.csv`, `turnout.ndjson` | comparecimento, abstenção, brancos, nulos e válidos por ano, turno e município | 50 |
| `candidates.csv`, `candidates.ndjson` | os candidatos de cada ano e turno | 12 |
| `votes.csv`, `votes.ndjson` | votos de cada candidato por ano, turno e município | 100 |
| `dicionario.csv` | cada campo de cada arquivo: tipo, significado e fonte | |
| `CITATION.cff` | como citar esta edição | |
| `SHA256SUMS` | SHA-256 de todos os outros arquivos | |

O CSV é UTF-8, com quebra de linha LF, colunas em ordem fixa e linhas ordenadas pela chave. O NDJSON tem um objeto JSON por linha, com as mesmas colunas, na mesma ordem e na mesma ordem de linhas: números são inteiros, uma célula vazia vira `null` e `ciclos` é uma lista de inteiros. O esquema (nomes e ordem das colunas) não muda entre edições; um campo novo só entra com um aviso aqui.

## Como as tabelas se ligam

`turnout` e `votes` ligam a `cities` por `uf` + `cd_municipio`; `votes` liga a `candidates` por `ano` + `turno` + `candidato_numero`. Números de candidato se repetem entre ciclos: sempre use o ano.

## Cuidados

- **Empates.** Não há campo de vencedor nem de margem. Um empate entre candidatos aparece apenas como dois candidatos com o mesmo número em `votos`; quem calcula vencedores precisa decidir o que fazer com ele.
- **Exterior.** Os postos de votação fora do Brasil têm `uf` = `zz`, `regiao` = `exterior` e `cd_ibge` vazio. Entram nos totais nacionais e não em totais por região ou estado. Em 2026, 1 postos constam em `cities`; alguns não foram instalados e têm eleitorado declarado e comparecimento zero.
- **Sem dados não é zero.** Um município ausente de um ciclo (Boa Esperança do Norte/MT existe só em 2026) não tem linhas nesse ciclo; `ciclos` diz em quais há dados.
- **Votos anulados em apuração separada.** `anulados_apu_sep` conta no comparecimento e não é válido, branco nem nulo (2018, turno 1, Salvador/BA, 746 votos). Em todas as linhas vale `validos + brancos + nulos + anulados_apu_sep = comparecimento`.
- **Totais nacionais.** A soma de todas as linhas, com o exterior, é igual aos totais que o próprio TSE publica para cada ciclo e turno; isso é conferido antes de cada edição.

## Origem

Resultados de 2026: arquivos oficiais assinados do site de resultados do TSE. Resultados de 2018 e 2022: dados abertos do TSE por município e zona, somados por município. As fontes, datas de coleta e hashes estão em `manifest.json` do repositório (https://github.com/hvasoares/voto-a-voto-oss) e na página https://voto-a-voto.com/sobre-os-dados/. O pipeline é determinístico: os mesmos arquivos de origem geram exatamente os mesmos bytes.

## Licença

Os arquivos desta edição (a compilação e a normalização feitas pelo projeto) são distribuídos sob Creative Commons Atribuição 4.0 (https://creativecommons.org/licenses/by/4.0/deed.pt-br). Os resultados em si são publicações oficiais do TSE; atribua a fonte (TSE) e o projeto.

## Como citar

Voto a Voto. Resultados da eleição presidencial por município, edição 2026-10-20. https://voto-a-voto.com/edicoes/2026-10-20/dados/

Identificador: `voto-a-voto-2026-10-20`. O endereço e os arquivos desta edição nunca mudam; uma edição nova tem outro endereço. Não há DOI. Veja também `CITATION.cff`.

## Conferir os arquivos

Na pasta dos arquivos: `shasum -a 256 -c SHA256SUMS` (ou `sha256sum -c SHA256SUMS`).
