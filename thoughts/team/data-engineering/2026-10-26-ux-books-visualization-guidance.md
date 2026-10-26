# UX and dashboard books: guidance for the election visualizations

Date: 2026-10-26

Question: do the UX books in the OpenDocuments indexes give guidance for our visualizations? Source: `opendocuments-engineering`
(vector search plus one generated answer). The content-creation and leadership indexes returned nothing relevant beyond
[the Lean Analytics note](2026-10-26-lean-analytics-visualization-principles.md).

## Confidence

None of these books covers maps or elections. The generated answer came back from the tool with "low" confidence (0.39).
The principles below match chunks visible in the search results, but the chapters were not read in full.

## Sources and what they say

**Modern Network Observability** (`modernnetworkobservability.epub`, dashboard and visualization chapter)
- A dashboard tells a story, has a defined audience and purpose, and is clear and simple.
- Data hierarchy: put the "big-ticket items" first, then context, laid out like a storybook. Separate overview and detail
  dashboards are fine if each stays focused.
- Interactivity: a static snapshot "might as well be a JPEG". Support zoom, drill-down and changing the time frame.
- Avoid clutter: group related panels into collapsible rows.
- Process: interview the audience, sketch a wireframe first, keep a feedback loop and iterate.

**Practical Python Data Wrangling and Data Quality** ("Foundations for Visual Eloquence")
- One visualization = one key idea.
- Prefer commonly understood forms (bar, column, line) for one independent variable.
- Every visual element should contribute to clarity.

**Designing Information Architecture** (`designinginformationarchitecture.epub`)
- Progressive disclosure: the key is what you hold off. Show only the information needed at each step.
- Limit navigation links at each wayfinding point to the essential ones.

**An accessibility guide** (`illustratedguide.epub`)
- Do not rely on colour alone. Use patterns, labels and structure around the chart, and consider screen-reader users.
- Test with colourblind users. The book cites Airbnb doing so for its map interface.
- Give users control: font size, dark mode, reduced motion.

## What this means for the site

1. Story first: open with the one finding (Lula 51.78%, Minas Gerais as the only state flip) before any controls.
2. Overview, then drill-down: country, state, city, with per-city files loaded on click. Keep the national view free of detail.
3. One chart, one idea: separate views for margin, swing and turnout, not one overloaded map.
4. Pair the map with familiar charts: ranked bars for top cities, lines for 2018, 2022 and 2026.
5. Do not encode meaning in colour alone: numeric legend, value in hover and focus text, and a sortable table of the same data.
   This also covers screen readers and the share cards.
6. Wireframe and test with a few real users (journalists, ordinary voters) before building.

## Open items

- Draft a wireframe of the national view and the state and city drill-down.
- Pick the chart set that sits next to the map, and define the table view.
- Drawing details (diverging palette centred on zero, legends, accessible colours) should come from the `dataviz` skill.
  Map technology options are in [the map note](2026-10-26-frontend-map-and-tse-granularity.md).
