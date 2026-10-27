# Issue #36 (Apoie o projeto, donation link): checkpoints

1. **The address and where the link goes.** `src/lib/donation.ts` reads `PUBLIC_DONATION_URL` (build configuration, like the metrics id);
   only a plain https address without credentials counts, anything else is "no address". `components/DonationLink.astro` draws the link
   in the footer line the shared layout puts on every page (next to "Privacidade"; no page of the build lacks it) and, as the outlined
   button of the Sketch frame, in a closing section of the data page. It opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`,
   "abre em nova aba" for screen readers). With no address nothing is drawn and the build passes; the deploy workflow passes the repository
   variable `PUBLIC_DONATION_URL` (empty today). The address is NOT supplied yet: no URL is invented anywhere (CI uses a placeholder
   `https://doacao.example.test/apoie` in its second e2e pass only, to exercise the link).
2. **The statement.** The data page's last section says "Doações e análise de uso são separadas. Não há anúncios em nenhuma página." in
   both states (heading "Apoie o projeto" with an address, "Anúncios e apoio" without). `src/lib/donation.test.ts` also scans the
   source and public files for ad-network names, and `e2e/donation.spec.ts` checks every built page loads no script, frame or image from another origin.
3. **Tests.** Unit: address validation (unset, blank, http, javascript:, data:, relative, credentials). E2E over every page of the build
   (read from `dist`, not a sample): with an address each page carries the link to it, in a new tab; without, none does.

## Screenshot review (fixture state: placeholder address configured, notice acknowledged), 390 wide

The Sketch frame "14 Sobre os dados, with donation footer" (page "Election SPA v3", 390x1123) is the data page with the closing section and the footer;
the real data page is much longer, so the capture is its last 330 px (`e2e/capture-donation.spec.ts`), compared with the bottom of the frame.

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | section heading | "Apoie o projeto" serif 22 px, rule above | same | none |
| 2 | text | "Doações e análise de uso são separadas. Não há anúncios em nenhuma página." over two lines | same wording and wrapping | none |
| 3 | button | 350x30, 1 px teal border, 8 px radius, bold teal "Apoie o projeto ↗  (abre em nova aba)" | same size and text (fixed: it first was 44 px high with mixed weights); the tap area is 44 px through a pseudo-element, the #19 rule, asserted by the e2e | none |
| 4 | footer under it | "Fonte: TSE, dados finais" centred, teal | same | none |
| 5 | line under the footer | absent | "Privacidade · Apoie o projeto ↗", the layout's footer line of every page | note: the frame draws no such line; the ticket asks for the link in every page footer and this line is where the layout already puts the privacy link |
| 6 | status bar "9:41" | drawn | absent | accepted-platform (prototype chrome) |

The Home footer (390x844, scrolled to its end) shows the same footer line; no Sketch frame exists for it.
Verdict: PASS (no blockers).
