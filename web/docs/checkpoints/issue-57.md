# Issue 57: Sobre os dados on desktop

## Frame

"14 Sobre os dados (desktop)" on "Election SPA v3 desktop" (1440x1650), taken as approved. The "Para jornalistas e associações" section of the frame is #29's and was not
built by this ticket: the page already carries it (the widget link, shipped by #29 earlier), so it is shown as shipped.

## What is built

The existing sections in a centered 760 px column (720 content) from 768 px; from 1024 px the top bar replaces the page header, the title is 44 px, section titles 28 px with
more space around the rules, body 15/22. No section, wording, stored-key list (#35) or the statement that donations and analytics are separate and that there are no ads (#36) was changed.

## Screenshot review (1440 wide, full page; capture `sobre`)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | length | 1650 px, short sections | 4,149 px: the page carries the full shipped content (manifest list with every source, "como os números são calculados", editions, sources and licence, privacy list) that the frame abbreviates | accepted: the ticket says "with the existing sections" |
| 2 | header, back link, title, column | "‹ Início", 44 px serif title, 720 px column, rules between sections | same | none |
| 3 | section titles and spacing | 28 px serif titles, rules | same | none |
| 4 | donation | "Apoie o projeto" button (when an address is configured) | same (placeholder address build) | none |

Verdict: PASS.
