# Screenshot-review protocol

Gate 2 of every checkpoint (after the behaviour tests pass). Purpose: find visual differences between the Sketch
frame and the real render, with someone who has not seen the code.

## Who and what

- **Reviewer:** a fresh context (new agent or person). It receives ONLY: (1) the reference image
  `site/reference/<frame>.png`, (2) the render `site/.captures/<slot>/<state>.png` made by
  `npm run check-slot -- <slot>`, (3) this protocol. No code, no ticket text, no author explanation.
- **Author:** runs `npm run check-slot -- <slot>`, hands over the two images, fixes what comes back.

## Validity (check first; if any fails, the comparison is INVALID and nothing is reviewed)

1. Both images are 390 px wide at scale 1; the render is 390x844 (the about page: reference and render are both 390x1123, full page). The capture's `.json` records the viewport.
2. Both show scroll position 0 (top of the page).
3. Both show the same data state: the slot's fixture state (`fixtureRoute` in the slot contract; the frame's numbers are in `reference/<frame>.texts.json`). Different cities, numbers or selected tab/view = invalid.
4. Same state of interaction (same tab, same view, nothing open that is closed in the other).

Invalid comparison: say which rule failed, stop, and ask the author for a valid capture.

## What the reviewer produces

A table of EVERY difference you can see, none skipped, none merged:

| # | Location (region + element, e.g. "header, brand text") | Reference shows | Render shows | Severity |
|---|---|---|---|---|

Cover: layout and spacing, alignment, text content and wording, font family/size/weight, colours, borders and radii,
bar proportions and colours, icons, tap-target size, anything present in one image and not the other.

**Severity**
- **blocker:** a difference that code can fix. Wrong or missing text, wrong colour/size/weight/spacing, missing or extra element, misaligned or overflowing content, wrong proportions.
- **accepted-platform:** unavoidable difference between Sketch rendering and the browser (antialiasing, sub-pixel text positioning, the iOS status bar "9:41" and home indicator that are prototype chrome, system font fallback). Must be justified in one line.
- **note:** cosmetic observation that does not need action (state why).

When unsure whether code can fix it, it is a **blocker**.

## Verdict

- **PASS:** no blockers, and every non-blocker is justified.
- **FAIL:** at least one blocker. The checkpoint goes back to the author; it is not waived. After the fix, run the gates again and review again.

## Rules

- No pixel-diff threshold against Sketch. Sketch and the browser never match pixel for pixel; judgement, not a percentage.
- The reviewer does not suggest code, only describes differences.
- A blank slot (still "not yet hydrated") is reviewed against its frame like any other and will FAIL: expected until hydrated.

## After approval: regression baseline

When a checkpoint is approved (verdict PASS, accepted by the owner), store its render as the regression baseline:

```
npm run approve-baseline -- <slot> --yes
```

This writes `site/e2e/baselines/<platform>/<slot>-<state>.png` (Playwright `toHaveScreenshot`, zero-diff tolerance) and
the file is committed with the checkpoint. `npm run test:baseline` compares later renders against it. Baselines are
valid on the platform that made them (fonts differ between macOS and Linux), so they are NOT part of CI.
Never run `approve-baseline` on your own work without the approval: the flag `--yes` is the confirmation.
