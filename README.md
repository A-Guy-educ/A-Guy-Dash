# A-Guy-Dash

The independently deployed administrative analytics dashboard for A-Guy.

## Security boundary

A-Guy-Web owns login, sessions, authorization, users, and database access.
A-Guy-Dash never receives `PAYLOAD_SECRET` or `DATABASE_URL` and never reads or
verifies the shared HttpOnly cookie. Its server forwards the cookie only to
A-Guy-Web's authenticated APIs.

The application shell comes from the immutable `@a-guy/ui` release, and API
request behavior comes from `@a-guy/api-client`. Production API calls use
`https://api.aguy.co.il`; that hostname is served by A-Guy-Web and does not own
separate data or secrets.

Production runs at `https://dash.aguy.co.il`. Anonymous users are redirected to
A-Guy-Web's central login and return already authenticated through the shared
`aguy.co.il` session cookie.

## Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

For real local SSO, run A-Guy-Web at `http://app.lvh.me:3000`, this application
at `http://dash.lvh.me:3001`, and use the local values documented in
`.env.example`.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
