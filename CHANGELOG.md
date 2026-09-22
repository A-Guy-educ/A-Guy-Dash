# Changelog

All notable changes to A-Guy-Dash are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## v0.4.1 — 2026-09-22

Two follow-ups to the v0.4 Product Health release. The `FormulaTooltip` and `TrendLineChart` tooltips were using `bg-popover` / `text-popover-foreground` classes that were never mapped in the tailwind config, so tooltips rendered transparent and blended into the card content behind them — swapped to `bg-foreground text-background` for a high-contrast inverted tooltip in both themes. Also narrows the Active User Rate formula copy from "All Identified Users" (lifetime user base) to "Distinct Signed-in Users in Period" (users with a session in the selected date range); this is copy-only on Dash — the matching numerator/denominator change on Web's `/api/dashboard-metrics` is a separate coordination item.

### Bug Fixes

- Fix Product Health tooltip contrast and rescope Active User Rate denominator copy (#28).

## v0.4.0 — 2026-09-16

Implements the Product Health spec v0.4 updates: adds a `Total New Registered Users` count KPI as the top card, replaces `lessonCompletionRate` with two lesson-type usability rates (`pdfScrollUsabilityRate`, `chatUsabilityRate`), and introduces per-card formula tooltips. All new schema fields are `.optional()` so Dash can ship ahead of the Web-side producer — missing fields degrade to per-card "N/A" instead of failing the whole payload.

### Features

- Implement Product Health v0.4 spec (#25) — new `CountKpiCard` for `totalNewRegisteredUsers` with absolute-count delta, two lesson-usability rate cards replacing `lessonCompletionRate`, and a shared `FormulaTooltip` that surfaces each KPI's numerator/denominator formula on hover.

## v0.3.1 — 2026-09-14

Removes the `day → month` upstream shim from the `/api/dashboard-metrics` proxy route now that Web accepts `period=day` natively (Web PR #1187, tests locked in via Web PR #1204). The Day tab of the Users view now reflects today's actual signup-source breakdown instead of month-to-date attribution.

### Refactor

- Remove the `upstreamPeriodFor` day→month rewrite and the echoed-period override from the dashboard-metrics proxy — Web now aggregates `signupSourceBreakdown` over the current day so buckets sum to `registeredToday`.

## v0.3.0 — 2026-09-10

Adds the Product Health tab (Spec v0.2) and expands period filtering to include a `day` bucket. Introduces the `/api/product-health` proxy route and widens Dash's Zod schema for the new `productHealth` block, kept `.optional()` so a missing Web-side payload degrades to an "awaiting upstream" state instead of failing the entire dashboard load.

### Features

- Scaffold Product Health tab (Spec v0.2) (#16) — five KPI cards with paired trend lines, forward-compat schema with `numerator`/`denominator` per bucket so weekly/monthly rollups can be recomputed rather than averaged.
- Wire Product Health filters to the live `/api/product-health` proxy (#18).
- Scope the Users tab cards to the selected period and add a `day` option to the period selector (#17).
- Hide the period picker on the Product Health tab (#19) — the tab owns its own date-range control.

### Bug Fixes

- Restore the `dev → main` promotion flow in the dash-release skill (#15).
- Keep the Dash brand link isolated in dev navigation so the dev alias no longer bounces back to prod.
- Keep Dash dev navigation isolated from prod alias routing.

### Refactor

- Insulate the dashboard-metrics proxy from unrelated schema drift and document the state seam between the shell and Product Health tab.

### Docs

- Add the `dash-release` skill — 7-stage pipeline forked from `admin-release` with a trust-boundary precondition and sibling-schema-drift check.

## v0.2.0 — 2026-09-08

First tagged release since the dashboard was extracted into its own repository. Covers all work between `feat: extract dashboard application` (659c7211b) and the current `main`.

### Features

- Add signup source breakdown widget (#13) — pie chart of Google / GuyKoren / direct / other / unknown signup origins, with zeroed-default schema for forward-compat while the Web-side producer rolls out.
- Adopt shared app platform (`@a-guy/ui`, `@a-guy/api-client` from `A-Guy-Shared`).
- Preserve dashboard period on handoff so period selection survives the login round-trip.

### Bug Fixes

- Address PR #13 review — schema default + legend precision.
- Make dashboard visible after login (session-cookie handoff fix).
