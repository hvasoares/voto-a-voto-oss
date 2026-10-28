# #103 Task-named top bar on desktop

At 1024 px and up the bar's links name tasks. The bar stays pre-rendered HTML (no script of its own), the search still mounts on first interaction, "/" is unchanged, the phone gets no menu.

## The bar's links (in keyboard order)

| Element | Text | Target (all through `withBase`) |
| --- | --- | --- |
| wordmark | Voto a Voto | `/` |
| search field | placeholder "Ver minha cidade", accessible name still "Busque sua cidade" | the existing CitySearch, mounted on first focus |
| link | Comparar | `/#comparar` (Home's chooser, #101) |
| link | Conferir | `/sobre-os-dados/#confira-voce-mesmo` |
| link | Usar os dados | `/sobre-os-dados/#usar-os-dados` |

"Ver minha cidade": it is the search itself, not a fourth anchor. The label is the field's placeholder (also in the mounted `CitySearch` when `bar` is true, so nothing changes at the swap). The accessible name stays "Busque sua cidade" (every spec and screen reader name is unchanged). No visible label or link was added: it would cost bytes on every page and add a tab stop. A placeholder is not a link: if the owner wants a literal link, `/#busca` is the target.

Dropped: `aria-current` (the three links are anchors into sections, not whole pages, so "current page" would be wrong); the plain field's `autocapitalize`, `spellcheck` and `enterkeyhint` (the field is replaced by CitySearch, which keeps them, on first focus; this paid for the footer line).

## Relatórios and Mapa por estado

Still on Home in "Entender o país e os estados" and now in the consent footer of `Base.astro`, a line of its own under "Edição · Privacidade": "Relatórios · Mapa por estado" (two 44 px links, `data-component="consent-footer"`). It is on EVERY page type and at EVERY width (the City card family included): no deviation. On the phone the footer grows by one 44 px line.

## Text and targets

Bar text moved to the scale: wordmark `text-step-4`, field `text-step-2`, "/" hint `text-step-1`, links `text-step-2` (was `text-[26px]`, `text-body`, `text-[11px]`). Every link and the wordmark is `min-h-11` (44 px) with the existing focus ring. The footer links use #88's pattern.

## Bytes (fixture, gzip, `scripts/measure.ts`, before -> after)

| Page | HTML | CSS | JS |
| --- | --- | --- | --- |
| City card `/rj/cidade-exemplo/` (budget 6553.6) | 6546 -> 6534 (margin now 19.6 B) | 15183 -> 15099 | 6964 same |
| Home (390) | 9004 -> 8984 | same | 3845 same |
| Estado `/rj/` | 7656 -> 7671 | same | 4275 same |
| Mapa | 7136 -> 7140 | same | 2459 same |
| Sobre os dados | 9254 -> 9219 | same | 1863 same |
| report `cidades-que-viraram` | 3944 -> 3932 | same | 2360 same |
| Brasil | 4364 -> 4328 | same | 1863 same |

Shared CSS -84 B (room now about 1285 B). No budget changed. The bar alone is -20 B on the City card; the footer line costs +14 B net after removing the input attributes.

## Tests

`desktop-topbar.spec.ts` (new, 10 tests): the bar's links and hrefs identical on Home, City card, Estado, Brasil, a report, Sobre os dados and Dados para nerds at 1440; keyboard order and focus rings; 44 px height and hit area of every bar link; each anchor lands on its section; Relatórios and Mapa por estado are not in the bar and are in the footer line of every page type; footer links 44 px; the search loads on first interaction only and "/" focuses it; axe on the bar; no-JS. Updated: `desktop-home.spec.ts` (bar links, no `aria-current` test replaced by the footer-line test, no-JS), `home.spec.ts` (scoped to the task block), `tap-targets.spec.ts` (consent footer is two lines).

## For #87

Bar and footer text are on the scale already. Pages still carry their own off-scale text (see earlier notes). The City card html has about 19.6 B of margin: do not grow `Base.astro` or the card.
