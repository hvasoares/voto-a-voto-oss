# Issue #35 (remember my place and preferences): checkpoints

1. **The place store.** `src/lib/place-store.ts`: a city or a state, kept in `localStorage` under `voto-a-voto:place`
   (JSON of `uf`, `slug`, `nome` only; never a position). Every access is guarded, a stored value that is not
   ours or is damaged reads as "no place", and the tests inject a fake storage (`place-store.test.ts`; a storage
   that throws on every call and no storage at all are cases). `src/lib/storage-keys.ts` is the one list of the keys the
   site writes (place, the register of #58, the metrics notice of #20); "esquecer meus dados" clears every one of them.
   Choice made: a key-value store in the browser (the same mechanism the register and the notice already use) rather
   than IndexedDB: three small values, synchronous so a tap can save before the page navigates, and no extra weight.
2. **The Home shortcut.** The block "Sua cidade" (or "Seu estado") is pre-rendered hidden and revealed by
   `scripts/home-place.ts` for a visitor whose browser remembers a place; without scripts or with blocked storage it
   stays out of the page. Picking = a tap on a state tile or on a search result (the two ways of choosing a place on
   Home; no other entry point was added). The last pick wins. The control "esquecer meus dados" clears the three keys and
   hides the block. A city opened by the location button of #40 is not saved: only a pick saves.
3. **The privacy text.** The Privacidade section of `/sobre-os-dados/` lists, from `src/lib/stored-items.ts`, every key
   with what it holds, says that none of it is sent anywhere and that the site works whole with storage blocked. The e2e
   `stored-privacy.spec.ts` walks the site (tile, language switch, "Prosseguir") and compares the keys it wrote with the list.

## Screenshot review (fixture state: Home with "Cidade Exemplo · RJ" saved), 390 wide, full page

Frame "1 Home, with the Sua cidade shortcut" (page "Election SPA v3", 390x900). The frame is taller than the 844
viewport, so the capture (`e2e/capture-place.spec.ts`) is full-page, taken after the notice was acknowledged.

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | shortcut card | 350x48 at y 198, 8 px radius, paper-2 fill, 1 px rule | same box (fixed: it first sat 4 px high and its text row was 2 px off) | none |
| 2 | label and name | "SUA CIDADE" 10 px muted over "Cidade Exemplo · UF ›" bold teal, x 32 | same positions and wording ("... · RJ" in the fixture) | none |
| 3 | "esquecer meus dados" | underlined 11 px muted, right-aligned at x 360, on the name's row | same (fixed: the 44 px tap target put the text 7 px low) | none |
| 4 | text and tiles below | "Ou escolha um estado" at y 250, tile grid at y 268, "Para explorar" at y 590 | same | none |
| 5 | status bar "9:41" | drawn | absent | accepted-platform (prototype chrome) |
| 6 | bottom of the page | footer line only | footer plus the "Privacidade" link of the metrics notice (#20) | note (not in the Sketch frames; page is 947 px tall instead of 900) |

Verdict: PASS (no blockers).

## Weight (home, gzip, `scripts/measure.ts dist`, fixture build)

JS 3114 B -> 3982 B (the page script 192 -> 470 B and two small shared chunks, `place-store` 475 B and
`storage-keys` 101 B, fetched on the home page), HTML 6386 -> 6604 B, CSS 12681 -> 12764 B. The shortcut has to read
the device on load, so this is the price of the feature; the search island and its data are still not fetched until the search is used.
