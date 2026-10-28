# Issue #39 ("E a sua cidade?"): checkpoints

1. **The reply flow, behaviour.** The button "E a sua cidade?" is on a head-to-head card whose A is a city (`data-duel-reply`, a plain link) and on Meu Brasil when it has a
   place (the first place is the sender's city). It opens `/cara-a-cara/?nivel=cidade&a=<city>&resposta=1`: A filled, the subtitle "<city> já está preenchida. Escolha a sua.",
   the search of B in focus, B's column "—" (the frame "19 Cara a cara, with the reply button": the primary button of that state is "E a sua cidade?", which puts the cursor
   back in the search). Choosing the second city draws the side-by-side card, takes `resposta=1` out of the address (the link shared back is the plain card), says
   "Pronto: agora você pode compartilhar o cartão de volta." and the existing share flow sends it. Events `duel_reply_started` (when the page opens in the reply state with the
   sender's city loaded; no property) and `duel_reply_completed` (the visitor's city was chosen; no property). Tests: `components/Duel.test.tsx` (the reply cases),
   `e2e/cara-a-cara.spec.ts` ("E a sua cidade?").
2. **Screenshot review**, `/cara-a-cara/?nivel=cidade&a=rj/cidade-exemplo&resposta=1` at 390x844 against "19 Cara a cara, with the reply button" and at 1440x900 against
   "19 Cara a cara, com o botão de resposta (desktop)"; capture `e2e/capture-cara-a-cara.spec.ts` (`phone-resposta`, `desktop-resposta`).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | title, subtitle, fields, four rows with "—" in B, primary button, note | as listed | same texts, same order, "—" in the B column | none |
| 2 | level selector (Cidade / Estado / Região) | not in this frame (the frame predates the selector) | present, as in the new #30 frames | note: the frame is older than the #30 selector; the selector is in "19 Cara a cara, por cidade (com seletor de nível)" |
| 3 | field B | teal 2 px border while focused, placeholder "Busque a sua cidade" | placeholder the same; focus ring is the shared field's | accepted (shared `PlacePicker`) |
| 4 | clear "×" in field A | none | removed from the head-to-head's fields (it overlapped long names) | fixed |
| 5 | 1440 | button 320x56 centred under the rows, note under it | same | none |
Verdict: PASS (no blockers).

Weight: Meu Brasil gains the link (its own page, not a first-load page of the audited set); `duel.reply` is the only duel sentence it imports.
