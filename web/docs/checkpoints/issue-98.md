# Issue #98: Sobre os dados by task

The page is ordered the way a visitor checks a number. Content is unchanged (a few words moved); sections were re-ordered, five were renamed in task words, the rest became subsections.

## Final anchors (public addresses: do not rename)

| Anchor | Section (h2) | Task |
|---|---|---|
| `#e-final` | Este resultado é final? (h3 `#final-nao-ao-vivo` "Final, não ao vivo") | is it final |
| `#qual-edicao` | Qual edição estou vendo? (h3 `#dados-abertos`) | which edition |
| `#de-onde-vem` | De onde vêm os números (h3: `#calculo`, `#licenca`, `#limites`, `#pendencias`) | where it comes from |
| `#confira-voce-mesmo` | Confira você mesmo (h3 `#conferido`) | check it myself |
| `#como-citar` | Como citar uma edição | cite |

After the five, unchanged and in place: `#jornalistas` (widget), `#codigo`, `#licencas` (MIT + CC BY 4.0), `#privacidade` (+ `#guardado-no-aparelho`), `#apoio`.

## Old to new

| Old | Now |
|---|---|
| `#de-onde-vem` | same id, now third task section |
| `#calculo`, `#limites`, `#pendencias`, `#licenca` | h3 inside `#de-onde-vem` (same ids) |
| `#conferido` | h3 inside `#confira-voce-mesmo` |
| `#confira` | empty alias at the start of `#confira-voce-mesmo` |
| `#edicoes` "Edições dos dados" | empty alias at the start of `#qual-edicao` |
| `#final-nao-ao-vivo` | h3 of `#e-final` (the rule paragraph moved with it) |
| "Como citar uma edição" (h3, no id) | h2 `#como-citar` |
| `#dados-abertos` | h3 inside `#qual-edicao` |
| `#jornalistas`, `#codigo`, `#licencas`, `#privacidade`, `#guardado-no-aparelho`, `#apoio` | unchanged |

Links in the repo into this page: `#privacidade` (every footer, the notice), `#edicoes` (api page): both still land. `e2e/sobre-links.spec.ts` walks every built page and checks each `sobre-os-dados/#...` link.

## Decisions
- The chip "Final, não ao vivo" is in this page's own footer (`data-component="final-chip"`), on the line right above the global edition line (Base.astro). Putting it in Base would grow every page; no new entry point added.
- The edition links (current edition, list, feed) were already on the page inside a sentence; they are now three 44 px rows (same targets, same words plus "Edição").
- "O que foi conferido" moved below the "Confira você mesmo" steps (steps first); step 4 says "lista abaixo".
- For #102: insert `<section id="usar-os-dados">` right after `#como-citar` (marked by a comment in the page) and move `#jornalistas` into it; `#codigo`, `#licencas` stay. For #99/#103: link `#e-final` (is it final), `#confira-voce-mesmo`, `#qual-edicao`, `#como-citar`.
- New headings use the type tokens (h2 `text-step-3!`, h3 `text-step-2` bold, footer `text-step-1`); body text stays off-scale for #87.

## Measurements (390x844, fixture, gzip)
/sobre-os-dados/ html 8594 -> 8749 B (raw 28064 -> 28399), JS 1863 B unchanged, shared CSS 15172 -> 15175 B (+3 B on every page), Home/Brasil JS and data unchanged.

## Sketch
"14 Sobre os dados (por tarefa)" B3A9D89C-2A72-4566-B576-279281C1E59A on "Election SPA v3" (screenshot-verified). Difference: the frame shows the edition links inline; the build uses 44 px rows.
