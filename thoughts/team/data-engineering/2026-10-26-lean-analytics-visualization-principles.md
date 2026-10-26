# Lean Analytics and our election visualizations

Date: 2026-10-26

Question: does the Lean Analytics book give better guidance for the visualizations? Source: the `opendocuments-leadership`
index (vector search only, no generated answer).

## Finding

The book is about choosing and framing metrics, not chart design. The queries on charts, maps, dashboards, funnels,
sparklines and heat maps returned no chart-design guidance from it. It helps with what each view should show, not how to draw it.
The retrieved passages are fragments, not full chapters.

## What the book says (from retrieved passages)

- A good metric is comparative: it can be compared with other time periods or groups. It is also a ratio or rate, and it
  changes how you act.
- A good metric is easy to understand at a glance.
- Vanity metrics make you feel good but do not change behaviour. Actionable metrics often come in pairs (for example a rate
  with its volume).
- Cohort analysis compares similar groups over time. A segment is a cross-section of everyone split by an attribute.
- The One Metric That Matters changes over time.
- Separately, another book in the same index (systems thinking) recommends behavior-over-time graphs over single-event views.

## What this means for the site

1. Colour by rates, not totals: margin in percentage points or candidate share. Raw votes only highlight São Paulo.
2. Make every view comparative. Margin swing between rounds is the strongest metric found in
   [the runoff highlights](2026-10-26-runoff-results-highlights.md). Add vs-2022 and vs-2018 views, since all three cycles
   now exist at city level.
3. Pair each rate with its size: show the swing next to the valid-vote count and apply a minimum-size filter. This fixes the
   big-city bias of the absolute-vote rankings.
4. Segment on purpose: region, state, city size.
5. Build cohorts from election history, for example group cities by their 2018 and 2022 result and show each group's 2026
   result. This shows who switched, which a single-year map cannot.
6. One headline metric per screen. For the map, use margin in percentage points.

## Out of scope for the book

Drawing details (diverging palette centred on zero, legends, accessible colours) should come from the `dataviz` skill.
Map technology options are in [the map note](2026-10-26-frontend-map-and-tse-granularity.md).

## Open items

- Sketch the national map view around margin swing, with the valid-vote count shown alongside.
- Join the 2018, 2022 and 2026 city files on the TSE municipality code for the cohort view.
