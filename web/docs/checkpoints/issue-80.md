# Issue 80: Dados para nerds, panel actions (Citar, CSV, Imagem)

## Sketch frame created (first checkpoint)
"N3b Dados para nerds: Citar este painel (diálogo, desktop)" on the page "Election SPA v3 desktop", id `5BCF365D-BF6F-445A-AA01-402FA0000C3F` (1440x900 at x 4620, y 7400): dimmed backdrop, the dialog card with the title, the note, the three
format tabs (Texto simples | BibTeX | Markdown), the citation box with the plain-text example, "Copiar" and its "Copiado" status. Built with the tokens of the neighbouring frames (paper #faf7f0, paper-2 #f1ecdf, rule #d9d3c3, accent #14505c, ink #1c1b18,
muted #6a6558; Iowan Old Style / Helvetica Neue) and screenshot-verified after fixing the text widths. The panel header actions ("Citar · CSV · Imagem") are in N1-N3 already.

## What was built
- `lib/nerds/actions.ts` (pure): the permalink (the canonical query string + `#painel-<id>`), the three citation formats, the CSV provenance block (Painel, Lugar, Definição, Fonte, Edição, Data, Cálculo, Não mede, Licença, Endereço: the four footer
  fields and the edition) and `csvText`/`parseCsv`; `export-spec.ts` makes the table behind every panel kind from the same spec the page draws (the Tabela de detalhe is read from its own table); `panel-card.ts` draws the 16:9 image (1600x900 SVG -> PNG with the
  existing `svgToPng`): question, numbers as text, seal, four-field footer, permalink.
- Island `PanelActions` (client:panel, one per page, mounted at the top): Citar / CSV / Imagem as real text buttons in every panel header; the Citar dialog has role=dialog, a focus trap, Esc, focus returned to the button; copy to the clipboard with a status line.
- The permalink of a citation reopens the same panel with the same numbers (tested through the map: measure, turno and cycle in the address, and the panel anchor).
- CSV numbers equal the screen for every panel kind that has a table (Placar, Par, Invariantes, Escada Ficha, Detalhe, map and histogram variants); the Detalhe enhancer's own CSV button was removed in favour of the panel action.
- Image: #25 (card generator) is done, so the action is shown (not disabled). No analytics property is added; nothing is sent anywhere.

## Notes
- The actions need JavaScript and a desktop width (they are part of the lazy desktop layer); a phone and the no-JS page have no action buttons (tested): they read the tables.
- The map CSV exports the view on screen (measure, turno, cycle of `data-drawn`); the histogram CSV its measure and turno.
