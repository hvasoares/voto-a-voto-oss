# #100 State story: an entry on the state page

- Predicate: `hasStory(uf, base)` in `src/lib/story-data.ts`; `storyUfs` (which feeds `getStaticPaths` of `/<uf>/historia/`) and `/<uf>/` both use it, so link and page cannot disagree.
- Link: one anchor in `nav.state-links` of `src/pages/[uf]/index.astro`, `data-link="story"`, inline Portuguese like its siblings: "Ver a história do estado ›". Placed right before "Resumo do estado ›" (other order unchanged). No new CSS: the existing `.state-links a` rule gives 44px height and the focus ring. At 390px story + recap share a row.
- Without scripts: the link is plain html; `/<uf>/historia/` renders the seven cards as a stacked list with the note "Sem scripts, os cartões aparecem em lista, na ordem" (not empty).
- Tests: `e2e/state-story-link.spec.ts` (build-level dist check for every state page vs `historia/index.html`; RJ opens the story; MT has none; keyboard focus ring; 390px no scroll, 44px, axe). `nerds-estado.spec.ts` order check relaxed. 10x clean with tap-targets and nerds-estado.
- Bytes (fixture, 390x844, gzip): /rj/ html 7636 -> 7657; /mt/ unchanged 6895; JS 4275 and CSS 15175 unchanged.
- Sketch: added "Ver a história do estado ›" to mobile 7DF45593 (text 0C10EDED, new row under "Ver mapa por estado") and desktop B97CD0C6 (text EEEF97E7, above "Resumo do estado", the three others moved 26px apart). Both screenshot-verified.
- Note: the `state_link_tap` analytics event passes `link: "story"` like it does for nerds.
