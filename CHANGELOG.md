# Changelog

All notable changes to A-Guy-Dash are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

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
