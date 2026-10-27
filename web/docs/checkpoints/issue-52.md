# Issue 52: City card, Share and QR on desktop

## Frames

"2 Cartão da cidade (desktop, base V2)", "3 Compartilhar (desktop)" and "4 Mostrar QR (desktop)" on the Sketch page "Election SPA v3 desktop",
taken as approved (the user launched the build). The lines of "2 ... com as linhas V3" are other tickets' (#22, #26, #31, #33, #41, #30) and are not built.

## Checkpoints

1. City card in two columns (card left, badge/sentence/Compartilhar/links right); the markup splits into the figures and the words (`viewFigures`, `viewSentence`)
2. Share dialog: centered 480 px dialog from 768 px; feature-detected Web Share (Copiar link replaces Compartilhar where the API is missing)
3. Mostrar QR centered with the print button
Tests: `e2e/desktop-card.spec.ts`, `src/components/ShareActions.test.tsx`, the phone suites adjusted (`city.spec.ts`, `share.spec.ts`).

## Screenshot review (1440x900, fixture state; capture: `e2e/capture-desktop.spec.ts`)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | card, right column top | small badge "EXEMPLO · DADOS FICTÍCIOS" | badge with the full notice "EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS" | accepted: the phone's honesty notice, kept whole |
| 2 | card, right column | sentence directly under the badge | the "Padrão / Linguagem simples" switch sits between (the V3 frame with the register selector, #58, draws it) | accepted: feature from #58 |
| 3 | card, legend values | values left-aligned at x=400 | same (label column 228 px; first capture right-aligned: fixed) | fixed |
| 4 | card, links | three rows with a grey second line | same text, 76 px rows | none |
| 5 | card, page header | none (the top bar) | none at 1024+ (the phone header is hidden) | none |
| 6 | share, picture | 240 px preview | 240 px | none |
| 7 | share, buttons | Copiar link (teal), Baixar imagem, Mostrar QR, no message text | same; the message text is hidden at 1024+ when there is no share API (first capture had the Copiar link label dark on teal and Mostrar QR teal: fixed) | fixed |
| 8 | share, notes | one explanatory line | two lines: the existing "O link vai no texto..." note and the explanation | accepted: the first note is the phone's contract |
| 9 | share, "Criar um cartão com uma medida" | link under the notes | absent: belongs to the card generator ticket (#15 of the V3 set), not built | accepted: not this ticket |
| 10 | share, behind | dimmed page with the top bar bright | same | none |
| 11 | QR, back link and title | "‹ Compartilhar", 44 px title, pill, QR 360 px, 22 px address, Imprimir cartaz + Voltar | same (first capture had no print button and a phone header: fixed) | fixed |
| 12 | QR, the QR drawing and "PLACEHOLDER" caption | the frame's illustrative glyph | the real build-time QR of the city address; no caption | accepted: the frame draws a placeholder |

Verdict: PASS (no open code-fixable difference).
