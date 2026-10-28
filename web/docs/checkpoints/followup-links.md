# Follow-up: four entry points and the licence wording (screenshot review, gate 2)

Captures: `web/.captures/followup-links/` (from `e2e/capture-followup-links.spec.ts`, fixture state; 390x844, and 1440x900 for the state page, Brasil e regiões and the data page). Sketch neighbours: "16 Meu Brasil", "15 Gerador de cartão", "8 Brasil e regiões", "5 Estado" (mobile, v3/v2) and the desktop frames of the same screens. No frame draws these four spots.

| Spot | Where | Difference from the neighbouring frame | Severity | Action |
| --- | --- | --- | --- | --- |
| "Já tem um cartão? Abrir cartão ›" | `/gerador/`, under the card and its download buttons, above the address note | Not in the frame "15 Gerador de cartão" (a new line of 14 px text, centred, link in the site link colour) | low | Plain text line reusing the page's note classes; needs the designer to confirm the position |
| "Baixar adesivo" | `/meu-brasil/`, after "Ver como história", before "E a sua cidade?" | Not in the frame "16 Meu Brasil" (the frame has no secondary buttons at all; the two existing ones are also later additions) | low | Same outline button as its two siblings (same width, height, radius); the stack is now three secondary buttons, a decision for design if it feels long |
| "Comparar com outro estado ›" | `/<uf>/`, link area "Mais sobre o estado" | Not in the frame "5 Estado"; the link area now has five links on the state of the fixture and wraps to a third row at 390 px | low | Same link style as its siblings |
| "Comparar regiões ›" | `/brasil/`, bottom row beside "Ver mapa por estado ›", before the data download | Not in the frame "8 Brasil e regiões"; the row has three items, which still fit at 390 px (no wrap, no sideways scroll) | low | Same bold link style as "Ver mapa por estado ›" |
| "Licenças do código e dos dados" | `/sobre-os-dados/`, new short section between "Fontes e licença" and "Privacidade" | Not in the frame "14 Sobre os dados"; same heading and paragraph styles as the neighbours | low | Reuses section classes |

Verdict: no code-fixable difference left; the only open point is that none of the four spots has a Sketch position (designer to draw or accept).

Older axe findings on pages touched (not from this change, left alone): `/<uf>/` has `label-content-name-mismatch` on the calc links (`a[data-cd]`); `/brasil/` and `/sobre-os-dados/` have `link-in-text-block` on the footer and the inline links. The new spec scopes axe to the area of the new link (and the whole page for `/gerador/` and `/meu-brasil/`, which are clean).

Wording reused: the dataset line is the release `LEIAME.md` "Licença" sentence (CC BY 4.0, "Os resultados em si são publicações oficiais do TSE; atribua a fonte (TSE) e o projeto"); the code line states the MIT licence of `LICENSE`.
