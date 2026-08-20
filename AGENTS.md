# A-Guy-Dash repository rules

- This repository owns only the A-Guy administrative analytics dashboard.
- A-Guy-Web owns login, sessions, users, authorization, database access,
  activity capture, and metric aggregation.
- Never add `PAYLOAD_SECRET`, `DATABASE_URL`, password handling, JWT
  verification, or direct database access here.
- Forward the incoming HttpOnly cookie only to configured A-Guy-Web APIs and
  never expose or log it.
- A-Guy-Web's `/api/dashboard-metrics` endpoint remains the final admin gate.
- Validate all request parameters and successful upstream responses.
- Private responses must use `Cache-Control: no-store`.
- Use TypeScript, Next.js App Router, semantic design tokens, and the existing
  dashboard component boundary.
- Run typecheck, lint, format check, tests, and production build for changes.
- Work directly on `main` unless the user explicitly requests a branch.
- Prefix shell commands with `rtk`.
