# Issue #29 (Embeddable city widget): checkpoints

1. **The widget and the snippet.** `pages/embed/[uf]/[slug]/index.astro` on `layouts/EmbedDoc.astro` (a shell with NO script at all: no
   analytics, no storage, no banner, no top bar; `noindex`; links open in a new tab) and `lib/widget.ts` (`widgetUrl`, `widgetSnippet`:
   one `<iframe>` at `width="100%"`, a fixed height, `style="border:0"` and a title; escaped so a name cannot break out; base-aware).
   The card shows the city, the generated headline (the same sentence as the city card), the source and the edition ("TSE · edição
   26/10/2026") and a link back to the city card at the same view. Tests: the snippet and its escaping, the page without a script and with only
   same-origin requests, three cities embedded in a 320 and a 390 px column (plain host page: size right, no scrollbar measured inside the
   frame), the link back opens the city card; on the REAL data the six cities with the longest sentences fit with no scrollbar
   (`e2e/real-data-widget.spec.ts`).
2. **The page that makes it.** `/widget/` (`components/WidgetBuilder.tsx`, the city field of the generator): previews at 390 and 320 px,
   the snippet, "Copiar snippet" (the test pastes what was copied into another page and the widget renders). The entry point decided with the
   user: a section "Para jornalistas e associações" on "Sobre os dados" (`#jornalistas`) linking to it.
3. **Screenshot review**, `/widget/?cidade=rj/cidade-exemplo` at 390x844 against "18 Widget da cidade".

## Consent and analytics

The ticket says the widget "loads no analytics until consent is given". The site's metrics model is notice-only (no consent gate, decided by
the user), and the widget goes further: it has no script at all, so it can never load analytics, whatever the host page does. The page that
makes the snippet says so in its note.

## Screenshot review (390x844, scroll 0, fixture city)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | header, title, subtitle | "Voto a Voto | Presidente 2026", "‹ Início", "Widget da cidade", "Cole no seu site: o resultado de uma cidade e um link de volta." | same | none |
| 2 | previews | "PRÉVIA · 390 PX" and "PRÉVIA · 320 PX" boxes: EXEMPLO tag, "TSE · edição 2026", serif city name, two lines of text, "Ver no Voto a Voto ›" | same structure with the real widget in a frame; the edition reads "edição 26/10/2026"; the text is the generated headline (three lines) | accepted: the frame's "Candidato A venceu com 52%" is a winner label; the headline is the catalog's neutral sentence |
| 3 | preview height | about 110 px, snippet `height="140"` | 200 px (snippet `height="200"`) | accepted: the height holds the longest sentences of the real data at 320 px (worst measured: 192 px) with no scrollbar (see the real-data test) |
| 4 | snippet | dark block, monospace, `<iframe src=".../embed/rj/cidade-exemplo" width="100%" height="140" style="border:0" title="Resultado de Cidade Exemplo">` | same shape, address `.../embed/rj/cidade-exemplo/` | none |
| 5 | button, note | "Copiar snippet" 48 px; "O widget não carrega análise até haver consentimento e mostra sempre a fonte e a edição. Sem barras de rolagem em 320 e 390 px." | same button; note says there is no script nor usage measurement, always the source and edition, no scrollbars | accepted: see "Consent and analytics" |
| 6 | status bar "9:41", home indicator | drawn | absent | accepted-platform |

Verdict: PASS (no blockers).
