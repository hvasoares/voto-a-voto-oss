# Glossary

One line per term and a link to the single source of truth. The definition lives there, never here.

- **Fact record**: the unit behind every number a page publishes; defined in [web/docs/facts.md](../web/docs/facts.md).
- **Budget**: the weight and loading limits of the audited routes; defined in [web/docs/perf-budgets.md](../web/docs/perf-budgets.md) and enforced by [web/scripts/perf-budgets.ts](../web/scripts/perf-budgets.ts).
- **Base path**: the prefix the site is served under; read through `siteBase` and `siteHref` in [web/src/paths.ts](../web/src/paths.ts).
- **Ready attributes**: the `data-ready` / `data-error` attributes a hydrated island publishes; defined in [web/src/lib/island-ready.ts](../web/src/lib/island-ready.ts).
- **Sentence catalog**: every sentence the site says, in both registers; defined in [web/src/lib/sentences/catalog.ts](../web/src/lib/sentences/catalog.ts).
