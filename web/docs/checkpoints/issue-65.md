# Issue #65 (Text outputs per city: WhatsApp block and radio bulletin): checkpoints

1. **Numbers for the ear, pure.** `src/lib/number-words.ts` (`spell`, `spellPercent`): pt-BR words for whole numbers up to 999.999.999 and for
   percentages with one decimal.
2. **The two texts, pure.** `src/lib/city-texts.ts` (`whatsappText`, `radioBulletin`, `textProblems`) and `src/lib/sentences/catalog-texts.ts` (the
   `text.*` keys, both registers; imported only by the code that prints the texts, so the phone's JS does not carry them). The WhatsApp block is the card's
   headline, a turnout line, the margin line, the source line and the short link, one per line. The bulletin spells every number, reads the two most
   voted candidates the same way, says it is final data and what the numbers do not show. A test for each template and for the edge cases (tie, margin
   larger than the people who stayed home, one vote, a name with a number, no data, fixture, overseas, plain register).
3. **The page, the files and the gate.** The texts are printed in the city's share page (`/uf/slug/compartilhar/`, section "Textos prontos",
   `CityTexts.astro`), both registers pre-rendered, so they are readable without scripts; the copy buttons are hidden until a 400-byte script shows them. One
   plain-text file per state (`/textos/<uf>.txt`, 27 states + overseas): the block and the bulletin of every city of the state. The build fails on a block over
   700 characters, a bulletin with a digit or a percent sign, or a bulletin outside 90..260 words (`cityTexts` throws; `npm run check:texts` runs it on a
   dataset without a build). Real dataset: 5.760 places, longest block 477 characters, longest bulletin 237 words.

## Where it lives (deviation, on purpose)

The ticket says "on the City page". The city card's html budget (6.4 KB gzip) has no room and the user's rule is not to add to it, so the texts sit on the
share page of the city, which exists for every city and is already the place of the message text. The city card is unchanged (a test asserts it has no
link to them). The ticket's "published as static text files" is delivered as one file per state, not two per city (11.000 more files for a 5.570-city site).

## Screenshot review (390x844 and 1440x900; fixture `/rj/cidade-exemplo/compartilhar/`)

Frame: "2 Cartão da cidade, com os textos prontos" (Sketch page "Election SPA v3", id 5DBC0BE2-D7F3-48FE-901E-C7223C0F541C, drawn by this ticket).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | section title and note | "Textos prontos", muted note | same | none |
| 2 | WhatsApp block | five lines in a paper-2 box, Copiar below | same lines; the fixture says "Dados fictícios, só de exemplo. Fonte real: TSE." instead of the edition line | accepted (fixture wording) |
| 3 | bulletin | one paragraph in a box, Copiar below | same, full text | none |
| 4 | state link | accent link at the end | same | none |
| 5 | placement | under the share actions on the phone sheet | same; on desktop the dialog scrolls inside to reach the section | accepted |
| 6 | note under "Boletim" in the frame | overlaps the box by 4 px | no overlap | frame defect, not code |

Verdict: PASS (no blockers).

## Measurements (real dataset, `SITE_BASE=/`, `astro build`, this machine)

| | before | after | change |
|---|---|---|---|
| dist raw (du) | 1.338.892 KB | 1.390.452 KB | +51.560 KB (+51.5 MB) |
| dist gzip (`tar -czf - dist`) | 249.978.880 B | 257.986.560 B | +8,0 MB |
| files | 53.179 | 53.207 | +28 (27 states + overseas text files, one more `/textos/` set) |
| build time | 426 s | 469 s | +43 s |

Most of the raw growth is the texts in both registers pre-rendered in the 5.760 share pages (about 9 KB per page) and the 28 state files (about 7 MB).

Phone first load, `scripts/measure.ts` at 390x844 (gzip bytes), city card `/sp/sao-paulo/` and its fetch of the shard:

| page | js | css | html | data | after |
|---|---|---|---|---|---|
| city card | 5.116 | 16.039 | 6.304 | 0 | 5.116 / 16.093 / 6.304 / 0 |
| home city search shard (`/rj/sao-paulo/` 404 route) | 3.316 | 16.039 | 2.497 | 61.583 | same, css 16.093 |
| share page | 101.883 | 16.039 | 11.076 | 0 | 101.883 / 16.093 / 12.368 / 0 |

JS and html of the city card are identical; the shared stylesheet grew by 54 B gzip (the classes of the new section), still under the 16 KB budget (16.384 B).
