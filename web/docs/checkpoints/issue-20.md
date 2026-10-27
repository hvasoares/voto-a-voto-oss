# Issue #20 (GA4 analytics + LGPD consent banner) : checkpoints

The locked contract: consent-FIRST — a Portuguese first-visit banner with "Aceitar"/"Recusar";
NOTHING is loaded and NO request goes to Google before consent (pinned by network-trace e2e); the
build never fetches gtag.js (the browser fetches googletagmanager.com at runtime, only after
consent); no typed search text, no personal data, no user ids; event names/props documented in one
module (`src/analytics/events.ts`, 26 events incl. the pre-existing wired vocabulary documented as
aliases); the measurement id comes from env (`PUBLIC_GA_MEASUREMENT_ID` — Astro only inlines
PUBLIC_-prefixed vars into client bundles; `GA_MEASUREMENT_ID` is also read — never a real G- id in
the repo), and with no id a grant is still a strict no-op while everything stays green.

1. **Consent store + GA4 provider + events table + banner + boot.** `src/lib/consent.ts`
   (localStorage `voto-a-voto:consent`, state unknown→granted/refused, injectable storage for node
   tests, try/catch so private windows keep working in-memory; `consent()` singleton). 
   `src/analytics/ga4.ts` (window.dataLayer + gtag stub, script injected once (`data-vv-ga4`) only
   after grant, `gtag('js')` + `gtag('config', id, {send_page_view:false})` + explicit page_view — no
   double counting; unknown event names/props dropped per the table; `analyticsFor(state, id)` =
   provider only if granted AND id, else noopAnalytics). `src/analytics/id.ts` (measurementId()).
   `src/analytics/events.ts` (one table: page_view, search, search_result_tap, city_view,
   city_cycles_view, round_switch, cycle_switch, map_view, map_state_tap, map_municipio_tap,
   state_tile_tap, state_link_tap, city_list_tap, report_opened, report_shared, share_opened,
   share_completed, share_cancelled, share_failed, image_downloaded, qr_screen_shown,
   poster_printed; exports EVENT_NAMES/eventDoc/eventProps). `ConsentBanner.astro` (fixed bottom,
   Portuguese, both buttons min-h-11, server-rendered hidden, status line for the change affordance)
   + `src/scripts/analytics-boot.ts` (reveal banner, pad the body by its height, wire buttons, and on
   boot: granted → install + page_view; unknown/refused → `settleAnalyticsWithoutInstall()`). Base
   renders the banner and adds its "Privacidade" footer link to `/sobre-os-dados/#privacidade`.
   Unit tests: consent (8), ga4 (9), id (3).

2. **The ordering problem — late-bound analytics.** Built HTML runs PAGE scripts BEFORE Base's boot
   script, and islands memoize analytics at mount: `src/analytics/index.ts` is now a stable proxy
   (`getAnalytics()` returns an object that delegates at call time) plus
   `onAnalyticsReady(cb)`/`setAnalytics()`/`settleAnalyticsWithoutInstall()` — load-time emissions
   (page_view wiring in city-card/city-cycles/report-analytics/qr-analytics) resolve at the boot
   verdict: dropped for undecided/refused visitors, NEVER replayed after a late grant; a late grant
   emits only what happens from then on. Report page load event goes through onAnalyticsReady;
   QrScreen carries `data-events` markers + the tiny `src/scripts/qr-analytics.ts` (qr_screen_shown
   via onAnalyticsReady; poster_printed via beforeprint — no island, the screen stays static); 
   `#18`'s privacy section rewritten to match what is actually collected + the
   `data-consent-change` button. e2e `e2e/consent.spec.ts` (12 tests): the no-id runs pin the banner
   (visibility, 44px buttons, nothing stored), the zero-requests-to-Google trace on a fresh visit,
   refusal remembered, site fully working with a grant and no id, and the change affordance
   (footer link → privacy section → button → banner with the previous choice); the with-id runs
   (gated on the env var, fake G-TEST id, googletagmanager stubbed 204) pin script injection +
   dedupe, the queue ['js','config','event'], boot-before-page-scripts, refused ⇒ no script/no
   request, coarse-only props (typed search text never reaches the queue), and ad-blocker resilience.

3. **Overlay stacking + full-suite reconciliation.** The share sheet and the consent banner are both
   `fixed bottom-0` overlays; at equal z-50 the banner (rendered last) intercepted pointer events on
   the share sheet's "Mostrar QR" (qr.spec timed out; the trace showed the banner subtree intercepting
   the click). The banner now sits at **z-40**, BELOW the page's own overlays (share sheet, dialogs at
   z-50): a first visit can still use those screens, the banner reappears when the overlay closes;
   the consent-first guarantee lives in the boot script, not the paint. Base's privacy link is NOT a
   `<footer>` element (the e2e specs resolve single-footer locators). Spec amendments: home.spec
   scopes the /Sobre os dados/ link to its footer (the banner adds a similar link on a first visit);
   cohorts.spec replaces "must not ship any JavaScript at all" with the updated contract — no
   astro-islands on the report and the no-JS describe still proves it renders complete (the only
   scripts shipped are the site-wide consent boot chunk + its import). Stale "no JavaScript at all /
   inert until #20" comments on the QR pages and QrScreen updated to describe the consent-gated
   scripts.

## Final measured numbers (default fixture build, this branch)

- unit: **503 passed** (was 479: +24 of #20 — consent 8, ga4 9, id 3, events 4).
- phone e2e (`--project=phone`): **172 passed, 5 skipped** (was 165; +7 consent no-id tests, the 5
  with-id tests skip without the env var). With `PUBLIC_GA_MEASUREMENT_ID=G-TEST1234567`: consent
  spec runs the other side — **8 passed, 4 skipped**.
- `npm run test:real` (../data): **70 passed** (~3.4 min, includes the real-data capture spec).
- tsc `--noEmit`: clean.

## Left as post-deploy team steps

- Put the real G- id in the deploy env (`PUBLIC_GA_MEASUREMENT_ID`) and verify once on a real phone
  against the GA4 realtime report (the suite only ever proves a FAKE, stubbed id — no real G- id is
  committed anywhere).
- GA4 property settings (data retention, "consent" signals) are configured in the Google console, not
  in this repo.