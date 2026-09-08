# Changelog

All notable changes to A-Guy-Dash are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## v0.2.0 — 2026-09-08

First tagged release since the dashboard was extracted into its own repository. Covers all work between `feat: extract dashboard application` (659c7211b) and the current `main`.

### Features

- Add signup source breakdown widget (#13) — pie chart of Google / GuyKoren / direct / other / unknown signup origins, with zeroed-default schema for forward-compat while the Web-side producer rolls out.
- Adopt shared app platform (`@a-guy/ui`, `@a-guy/api-client` from `A-Guy-Shared`).
- Preserve dashboard period on handoff so period selection survives the login round-trip.

### Bug Fixes

- Address PR #13 review — schema default + legend precision.
- Make dashboard visible after login (session-cookie handoff fix).
