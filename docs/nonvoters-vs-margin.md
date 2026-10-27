# Os não-votantes superam a margem? (ticket #24)

Uma medida, sem tela. Para cada ciclo, turno e estado: em que fração das cidades (e do eleitorado) o número de pessoas que
não votaram em ninguém é maior do que a margem de votos do primeiro colocado sobre o segundo.

Reproduzir: `make nonvoters` (ou `uv run voto-data nonvoters`), que lê o `data/` commitado, sem rede, e imprime as
tabelas abaixo byte a byte (o teste `tests/integration/test_nonvoters_note.py` falha se este arquivo e o comando divergirem).

## Método

- **Não votaram** (cidade e turno) = `aptos - validos`: abstenção + brancos + nulos (+ votos anulados em apuração
  separada). É a mesma definição do cartão da cidade. Inclui os poucos eleitores de seções que o TSE informa como não
  instaladas (470, 657 e 423 pessoas no país inteiro em 2018, 2022 e 2026).
- **Margem** = votos válidos do primeiro candidato menos os do segundo, naquela cidade e turno (o segundo vale 0 se só um
  candidato tem votos). No 1º turno são os dois mais votados da cidade entre todos; no 2º turno são os dois candidatos.
- **Maior** é estritamente maior: se os dois números são iguais, a cidade não conta.
- **Cidades** = municípios com eleitorado e com votos válidos no turno; cidades sem nenhum dos dois não têm vencedor nem
  margem e ficam fora da base (a contagem aparece abaixo de cada tabela; hoje é zero). **Eleitorado** = eleitores aptos
  dessas cidades; "% do eleitorado" é o eleitorado das cidades em que os não-votantes superam a margem sobre o eleitorado
  total do grupo.
- **Exterior** (uf `zz`) fica de fora de tudo, inclusive do total "Brasil (sem exterior)".
- Estado = UF do município. O DF tem uma só cidade (Brasília): ou todo o DF conta, ou nenhum.

## O que a medida diz, e o que não diz

Ela compara dois números da mesma cidade: quantas pessoas aptas não votaram em ninguém e quantos votos separaram os dois
primeiros. Não diz quem seriam essas pessoas, em quem votariam, nem que o resultado teria mudado: a margem é uma diferença
entre dois candidatos, e os não-votantes não pertencem a candidato algum. Não explica por que elas não votaram.

## Limites dos dados, por ciclo

- **2018 e 2022**: resultados finais do TSE (dados abertos, votação por candidato e detalhe de votação por zona), somados
  por município. Há 5.570 municípios. Em 2018, 1º turno, Salvador/BA tem 746 votos anulados em apuração separada, contados
  aqui entre os que não votaram. O TSE informa eleitores de seções não instaladas (470 em 2018, 657 em 2022), que entram em
  "não votaram" pela definição acima (efeito desprezível: menos de 0,001% do eleitorado).
- **2026**: arquivos de resultado do site de resultados do TSE, só cidades marcadas como finais (os dados são finais, não ao
  vivo). Há 5.571 municípios (Boa Esperança do Norte/MT só existe em 2026, então o conjunto de cidades não é o mesmo dos
  outros ciclos). `nulos` é o total do TSE (`tvn`), que inclui nulos técnicos; o arquivo não informa as seções não
  instaladas (a diferença de 423 pessoas é calculada, não informada).
- **Todos os ciclos**: a base é o município; nada aqui diz respeito a zonas ou seções. A comparação entre ciclos é entre
  conjuntos de cidades quase iguais, mas com eleitorados e candidatos diferentes; o 1º turno tem muitos candidatos e o 2º só dois.

## Números

### 2018, 1º turno

| UF | Cidades | Com não-votantes > margem | % das cidades | Eleitorado | % do eleitorado |
|---|---:|---:|---:|---:|---:|
| AC | 22 | 12 | 54,5% | 547.608 | 26,6% |
| AL | 102 | 57 | 55,9% | 2.187.948 | 75,4% |
| AM | 62 | 35 | 56,5% | 2.428.842 | 27,9% |
| AP | 16 | 12 | 75,0% | 512.119 | 93,2% |
| BA | 417 | 167 | 40,0% | 10.392.015 | 59,7% |
| CE | 184 | 169 | 91,8% | 6.343.897 | 95,0% |
| DF | 1 | 0 | 0,0% | 2.085.825 | 0,0% |
| ES | 78 | 55 | 70,5% | 2.754.739 | 57,0% |
| GO | 246 | 187 | 76,0% | 4.454.402 | 45,8% |
| MA | 217 | 50 | 23,0% | 4.536.954 | 41,4% |
| MG | 853 | 762 | 89,3% | 15.698.955 | 66,5% |
| MS | 79 | 73 | 92,4% | 1.877.705 | 56,5% |
| MT | 141 | 116 | 82,3% | 2.330.024 | 58,4% |
| PA | 144 | 92 | 63,9% | 5.498.941 | 77,8% |
| PB | 223 | 92 | 41,3% | 2.868.028 | 67,2% |
| PE | 185 | 105 | 56,8% | 6.569.262 | 79,2% |
| PI | 224 | 5 | 2,2% | 2.370.421 | 30,2% |
| PR | 399 | 242 | 60,7% | 7.972.308 | 28,2% |
| RJ | 92 | 55 | 59,8% | 12.406.805 | 69,4% |
| RN | 167 | 89 | 53,3% | 2.373.957 | 72,8% |
| RO | 52 | 32 | 61,5% | 1.175.617 | 28,6% |
| RR | 15 | 1 | 6,7% | 333.591 | 2,3% |
| RS | 497 | 258 | 51,9% | 8.353.657 | 56,9% |
| SC | 295 | 107 | 36,3% | 5.073.479 | 12,9% |
| SE | 75 | 29 | 38,7% | 1.577.123 | 69,0% |
| SP | 645 | 408 | 63,3% | 33.042.545 | 65,2% |
| TO | 139 | 111 | 79,9% | 1.039.188 | 68,9% |
| Brasil (sem exterior) | 5.570 | 3.321 | 59,6% | 146.805.955 | 59,5% |

Estados em que mais da metade das cidades tem não-votantes > margem: 19 de 27.
Cidades fora da base (sem eleitorado ou sem votos válidos): 0.

### 2018, 2º turno

| UF | Cidades | Com não-votantes > margem | % das cidades | Eleitorado | % do eleitorado |
|---|---:|---:|---:|---:|---:|
| AC | 22 | 12 | 54,5% | 547.590 | 26,6% |
| AL | 102 | 51 | 50,0% | 2.187.735 | 72,1% |
| AM | 62 | 42 | 67,7% | 2.428.821 | 33,2% |
| AP | 16 | 15 | 93,8% | 512.117 | 97,1% |
| BA | 417 | 124 | 29,7% | 10.391.945 | 26,1% |
| CE | 184 | 10 | 5,4% | 6.343.848 | 33,9% |
| DF | 1 | 0 | 0,0% | 2.086.086 | 0,0% |
| ES | 78 | 54 | 69,2% | 2.754.749 | 57,4% |
| GO | 246 | 212 | 86,2% | 4.454.429 | 61,9% |
| MA | 217 | 38 | 17,5% | 4.536.973 | 34,2% |
| MG | 853 | 817 | 95,8% | 15.699.063 | 91,0% |
| MS | 79 | 76 | 96,2% | 1.877.747 | 66,5% |
| MT | 141 | 119 | 84,4% | 2.330.011 | 59,3% |
| PA | 144 | 112 | 77,8% | 5.498.812 | 85,2% |
| PB | 223 | 17 | 7,6% | 2.868.023 | 42,8% |
| PE | 185 | 37 | 20,0% | 6.569.316 | 50,8% |
| PI | 224 | 2 | 0,9% | 2.370.422 | 27,8% |
| PR | 399 | 237 | 59,4% | 7.972.415 | 27,2% |
| RJ | 92 | 77 | 83,7% | 12.406.861 | 92,3% |
| RN | 167 | 43 | 25,7% | 2.373.876 | 59,7% |
| RO | 52 | 38 | 73,1% | 1.175.634 | 61,7% |
| RR | 15 | 10 | 66,7% | 333.576 | 25,9% |
| RS | 497 | 294 | 59,2% | 8.353.814 | 67,3% |
| SC | 295 | 105 | 35,6% | 5.073.146 | 22,9% |
| SE | 75 | 18 | 24,0% | 1.577.191 | 51,4% |
| SP | 645 | 403 | 62,5% | 33.042.569 | 71,3% |
| TO | 139 | 114 | 82,0% | 1.039.178 | 88,5% |
| Brasil (sem exterior) | 5.570 | 3.077 | 55,2% | 146.805.947 | 60,3% |

Estados em que mais da metade das cidades tem não-votantes > margem: 16 de 27.
Cidades fora da base (sem eleitorado ou sem votos válidos): 0.

### 2022, 1º turno

| UF | Cidades | Com não-votantes > margem | % das cidades | Eleitorado | % do eleitorado |
|---|---:|---:|---:|---:|---:|
| AC | 22 | 12 | 54,5% | 587.738 | 27,0% |
| AL | 102 | 45 | 44,1% | 2.326.491 | 70,3% |
| AM | 62 | 37 | 59,7% | 2.646.924 | 81,8% |
| AP | 16 | 14 | 87,5% | 550.165 | 94,7% |
| BA | 417 | 81 | 19,4% | 11.283.405 | 18,9% |
| CE | 184 | 4 | 2,2% | 6.818.732 | 28,8% |
| DF | 1 | 1 | 100,0% | 2.206.996 | 100,0% |
| ES | 78 | 67 | 85,9% | 2.922.379 | 87,5% |
| GO | 246 | 228 | 92,7% | 4.870.292 | 90,8% |
| MA | 217 | 34 | 15,7% | 5.039.287 | 31,2% |
| MG | 853 | 710 | 83,2% | 16.283.828 | 92,4% |
| MS | 79 | 78 | 98,7% | 1.995.932 | 99,7% |
| MT | 141 | 106 | 75,2% | 2.469.604 | 70,7% |
| PA | 144 | 82 | 56,9% | 6.079.280 | 72,4% |
| PB | 223 | 11 | 4,9% | 3.092.053 | 39,5% |
| PE | 185 | 26 | 14,1% | 7.015.421 | 46,5% |
| PI | 224 | 0 | 0,0% | 2.570.433 | 0,0% |
| PR | 399 | 332 | 83,2% | 8.480.435 | 72,7% |
| RJ | 92 | 90 | 97,8% | 12.826.356 | 99,3% |
| RN | 167 | 20 | 12,0% | 2.554.716 | 40,0% |
| RO | 52 | 30 | 57,7% | 1.229.998 | 52,3% |
| RR | 15 | 1 | 6,7% | 366.632 | 2,1% |
| RS | 497 | 327 | 65,8% | 8.589.432 | 80,8% |
| SC | 295 | 132 | 44,7% | 5.501.478 | 39,7% |
| SE | 75 | 7 | 9,3% | 1.671.376 | 40,0% |
| SP | 645 | 596 | 92,4% | 34.684.927 | 96,7% |
| TO | 139 | 81 | 58,3% | 1.094.346 | 74,2% |
| Brasil (sem exterior) | 5.570 | 3.152 | 56,6% | 155.758.656 | 71,7% |

Estados em que mais da metade das cidades tem não-votantes > margem: 16 de 27.
Cidades fora da base (sem eleitorado ou sem votos válidos): 0.

### 2022, 2º turno

| UF | Cidades | Com não-votantes > margem | % das cidades | Eleitorado | % do eleitorado |
|---|---:|---:|---:|---:|---:|
| AC | 22 | 12 | 54,5% | 587.765 | 27,0% |
| AL | 102 | 58 | 56,9% | 2.325.814 | 74,9% |
| AM | 62 | 40 | 64,5% | 2.647.123 | 84,0% |
| AP | 16 | 16 | 100,0% | 550.131 | 100,0% |
| BA | 417 | 87 | 20,9% | 11.282.999 | 19,8% |
| CE | 184 | 5 | 2,7% | 6.818.192 | 29,2% |
| DF | 1 | 1 | 100,0% | 2.207.628 | 100,0% |
| ES | 78 | 62 | 79,5% | 2.922.264 | 85,3% |
| GO | 246 | 226 | 91,9% | 4.870.621 | 90,0% |
| MA | 217 | 39 | 18,0% | 5.039.307 | 32,1% |
| MG | 853 | 678 | 79,5% | 16.284.615 | 88,9% |
| MS | 79 | 73 | 92,4% | 1.996.066 | 95,7% |
| MT | 141 | 83 | 58,9% | 2.469.797 | 59,4% |
| PA | 144 | 90 | 62,5% | 6.078.857 | 75,1% |
| PB | 223 | 13 | 5,8% | 3.091.719 | 40,5% |
| PE | 185 | 29 | 15,7% | 7.015.086 | 47,0% |
| PI | 224 | 2 | 0,9% | 2.570.253 | 0,3% |
| PR | 399 | 288 | 72,2% | 8.480.626 | 41,1% |
| RJ | 92 | 86 | 93,5% | 12.827.044 | 97,6% |
| RN | 167 | 20 | 12,0% | 2.554.326 | 39,7% |
| RO | 52 | 24 | 46,2% | 1.230.172 | 48,1% |
| RR | 15 | 3 | 20,0% | 366.641 | 6,0% |
| RS | 497 | 293 | 59,0% | 8.589.684 | 71,7% |
| SC | 295 | 93 | 31,5% | 5.501.284 | 23,5% |
| SE | 75 | 9 | 12,0% | 1.671.241 | 43,3% |
| SP | 645 | 531 | 82,3% | 34.684.876 | 88,3% |
| TO | 139 | 107 | 77,0% | 1.094.302 | 83,9% |
| Brasil (sem exterior) | 5.570 | 2.968 | 53,3% | 155.758.433 | 66,7% |

Estados em que mais da metade das cidades tem não-votantes > margem: 16 de 27.
Cidades fora da base (sem eleitorado ou sem votos válidos): 0.

### 2026, 1º turno

| UF | Cidades | Com não-votantes > margem | % das cidades | Eleitorado | % do eleitorado |
|---|---:|---:|---:|---:|---:|
| AC | 22 | 9 | 40,9% | 613.742 | 18,4% |
| AL | 102 | 56 | 54,9% | 2.442.126 | 74,5% |
| AM | 62 | 41 | 66,1% | 2.798.611 | 85,0% |
| AP | 16 | 15 | 93,8% | 576.988 | 96,2% |
| BA | 417 | 111 | 26,6% | 11.312.752 | 32,8% |
| CE | 184 | 29 | 15,8% | 6.996.545 | 47,0% |
| DF | 1 | 1 | 100,0% | 2.258.320 | 100,0% |
| ES | 78 | 58 | 74,4% | 2.991.650 | 81,5% |
| GO | 246 | 211 | 85,8% | 5.080.590 | 82,7% |
| MA | 217 | 56 | 25,8% | 5.183.115 | 43,2% |
| MG | 853 | 786 | 92,1% | 16.372.372 | 95,0% |
| MS | 79 | 70 | 88,6% | 2.024.430 | 86,3% |
| MT | 142 | 58 | 40,8% | 2.637.801 | 43,7% |
| PA | 144 | 78 | 54,2% | 6.262.397 | 70,3% |
| PB | 223 | 28 | 12,6% | 3.248.531 | 49,1% |
| PE | 185 | 27 | 14,6% | 7.223.450 | 51,3% |
| PI | 224 | 3 | 1,3% | 2.704.758 | 1,4% |
| PR | 399 | 269 | 67,4% | 8.613.657 | 56,8% |
| RJ | 92 | 76 | 82,6% | 12.857.648 | 95,8% |
| RN | 167 | 46 | 27,5% | 2.659.825 | 60,6% |
| RO | 52 | 7 | 13,5% | 1.265.893 | 34,7% |
| RR | 15 | 2 | 13,3% | 401.521 | 4,8% |
| RS | 497 | 227 | 45,7% | 8.522.545 | 66,0% |
| SC | 295 | 63 | 21,4% | 5.734.651 | 19,5% |
| SE | 75 | 13 | 17,3% | 1.740.135 | 44,7% |
| SP | 645 | 464 | 71,9% | 34.122.892 | 85,5% |
| TO | 139 | 120 | 86,3% | 1.182.023 | 70,2% |
| Brasil (sem exterior) | 5.571 | 2.924 | 52,5% | 157.828.968 | 68,4% |

Estados em que mais da metade das cidades tem não-votantes > margem: 13 de 27.
Cidades fora da base (sem eleitorado ou sem votos válidos): 0.

### 2026, 2º turno

| UF | Cidades | Com não-votantes > margem | % das cidades | Eleitorado | % do eleitorado |
|---|---:|---:|---:|---:|---:|
| AC | 22 | 15 | 68,2% | 613.715 | 74,9% |
| AL | 102 | 42 | 41,2% | 2.442.081 | 65,4% |
| AM | 62 | 39 | 62,9% | 2.798.661 | 82,7% |
| AP | 16 | 16 | 100,0% | 576.910 | 100,0% |
| BA | 417 | 57 | 13,7% | 11.312.891 | 14,5% |
| CE | 184 | 4 | 2,2% | 6.996.521 | 1,6% |
| DF | 1 | 1 | 100,0% | 2.258.995 | 100,0% |
| ES | 78 | 59 | 75,6% | 2.991.515 | 82,3% |
| GO | 246 | 211 | 85,8% | 5.080.385 | 82,6% |
| MA | 217 | 34 | 15,7% | 5.183.049 | 15,8% |
| MG | 853 | 704 | 82,5% | 16.372.144 | 89,0% |
| MS | 79 | 70 | 88,6% | 2.024.437 | 86,3% |
| MT | 142 | 59 | 41,5% | 2.637.879 | 44,0% |
| PA | 144 | 78 | 54,2% | 6.262.063 | 70,0% |
| PB | 223 | 8 | 3,6% | 3.248.434 | 36,5% |
| PE | 185 | 6 | 3,2% | 7.223.227 | 8,9% |
| PI | 224 | 2 | 0,9% | 2.704.695 | 0,3% |
| PR | 399 | 252 | 63,2% | 8.613.628 | 55,2% |
| RJ | 92 | 85 | 92,4% | 12.857.526 | 98,6% |
| RN | 167 | 15 | 9,0% | 2.659.867 | 35,4% |
| RO | 52 | 10 | 19,2% | 1.265.926 | 36,5% |
| RR | 15 | 8 | 53,3% | 401.540 | 18,4% |
| RS | 497 | 215 | 43,3% | 8.522.318 | 65,5% |
| SC | 295 | 54 | 18,3% | 5.734.687 | 18,5% |
| SE | 75 | 0 | 0,0% | 1.740.093 | 0,0% |
| SP | 645 | 437 | 67,8% | 34.123.591 | 84,7% |
| TO | 139 | 123 | 88,5% | 1.182.041 | 89,0% |
| Brasil (sem exterior) | 5.571 | 2.604 | 46,7% | 157.828.819 | 60,6% |

Estados em que mais da metade das cidades tem não-votantes > margem: 14 de 27.
Cidades fora da base (sem eleitorado ou sem votos válidos): 0.

## O que os números sustentam (a decisão do título do mapa de quem ficou em casa, #32)

Lendo as linhas "Brasil (sem exterior)":

| Ciclo e turno | Cidades com não-votantes > margem | Eleitorado dessas cidades |
|---|---:|---:|
| 2018, 1º | 59,6% | 59,5% |
| 2018, 2º | 55,2% | 60,3% |
| 2022, 1º | 56,6% | 71,7% |
| 2022, 2º | 53,3% | 66,7% |
| 2026, 1º | 52,5% | 68,4% |
| 2026, 2º | 46,7% | 60,6% |

- **Sustentado**: em cada ciclo e turno, entre cerca de metade e três quintos das cidades (46,7% a 59,6%) têm mais
  pessoas que não votaram em ninguém do que votos de margem entre os dois primeiros, e essas cidades reúnem de 59,5% a 71,7%
  do eleitorado. Vale como afirmação **por ciclo e turno, com o número daquela seleção**, em frase como "Em X% das cidades,
  o número de pessoas que não votaram em ninguém foi maior do que a diferença de votos entre os dois primeiros".
- **Não sustentado**: "na maioria das cidades" para todos os ciclos (em 2026, 2º turno são 46,7%; só 13 a 14 estados de 27
  passam de metade das cidades em 2026, contra 19 em 2018, 1º turno); qualquer frase única para o país que ignore o ciclo e o
  turno; qualquer afirmação por estado em geral (varia de 0% a 90% ou mais entre estados de um mesmo turno, por exemplo CE e PI
  em 2018, 1º turno); e qualquer sugestão de que os não-votantes decidiriam, mudariam ou explicariam o resultado.
- **Para o título do mapa (#32)**: o mapa mostra só a parcela de quem não votou em ninguém, sem candidatos. Esta medida não
  sustenta um título que atribua efeito a essa parcela. O título pode afirmar o que o mapa mostra (a parcela do eleitorado que
  não votou em ninguém, por estado, no ciclo e turno escolhidos) e, se quiser a comparação com a margem, só na forma acima,
  com o número da seleção e a ressalva do que ela não diz.
