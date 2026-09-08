---
name: dash-release
description: Cut and ship a Dash release end-to-end. Prepares a release PR into dev (version bump + CHANGELOG), promotes dev → main, runs vercel --prod, tags, and verifies the new version is live at dash.aguy.co.il. Use when the user says "release dash", "cut a dash release", "ship a dash version", or asks to promote dash dev to prod.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Dash Release Skill

Sibling of the `web-release` and `admin-release` skills — same pipeline shape, different targets. Dash is the thinnest of the three (no DB, no auth code, no Docker, no dedicated smoke script), so this skill is a cut-down version of `admin-release` with the Docker/Render stage removed and Dash-specific preflight checks added.

**Finish line:** a new semver tag lands on `main`, `vercel --prod` completes, and [dash.aguy.co.il](https://dash.aguy.co.il) responds with the new version. Only Vercel serves Dash — no Render, no Docker step.

**Cross-repo context lives in [`../../../../CLAUDE_SHARED.md`](../../../../CLAUDE_SHARED.md).** Read it before running for the first time — Vercel auto-deploy is OFF and the alias/scope gotchas will bite you.

**Trust boundary:** Dash has NO database access, NO auth code, NO secrets. All metrics come from Web's `/api/dashboard-metrics`. If a code change under review here touches MongoDB, `PAYLOAD_SECRET`, or JWT verification, that's a violation of [`AGENTS.md`](../../../AGENTS.md) — halt and surface to the user before releasing.

---

## Preconditions

Run all of these before starting. If any fails, stop and surface the error to the user.

```bash
# 1. Right repo, right dir
test -f kody.config.json || { echo "Not in A-Guy-Dash root"; exit 1; }
grep -q '"name": "a-guy-dash"' package.json || { echo "package.json doesn't look like the Dash repo"; exit 1; }

# 2. Correct GitHub identity (default account has no repo access)
gh auth switch --user aguyshayb

# 3. Vercel CLI is logged in to the aguy team scope
vercel whoami   # expect "aguyshayb-6573"

# 4. Working tree clean (no untracked release artifacts)
git status --porcelain

# 5. Trust boundary intact — no forbidden imports crept in
grep -rE "from ['\"]mongodb['\"]|require\(['\"]mongodb['\"]\)|PAYLOAD_SECRET|verifyJWT|payload/dist" src/ && { echo "Trust boundary violation — Dash must not touch DB/auth"; exit 1; } || true
```

---

## Stage 0 — Pre-flight review

**Always run this before Stage 1.** Report findings to the user and wait for a go/no-go decision before proceeding. The goal is to surface anything that would make this release risky, misleading, or dead on arrival.

### 0a. Collect the commit set

```bash
git fetch origin dev main
LAST_RELEASE_SHA=$(git log origin/main --grep="^chore: release v" --format="%H" -n 1)
# First-release edge case — no previous release commit. Fall back to root.
if [ -z "$LAST_RELEASE_SHA" ]; then
  LAST_RELEASE_SHA=$(git rev-list --max-parents=0 origin/main | head -1)
  echo "First release — walking history from repo root."
fi
COMMITS=$(git log --format="%H %s" "${LAST_RELEASE_SHA}..origin/dev")
FILES_CHANGED=$(git diff --name-only "${LAST_RELEASE_SHA}..origin/dev")
```

### 0b. Classify commits (with compound-prefix unwrap)

Kody's convention prefixes everything with `chore:` even when the underlying change is `feat`/`fix` (e.g., `chore: feat(dashboard): ...`). Unwrap before classifying:

```javascript
// pseudocode — Claude applies this per commit subject
function classify(subject) {
  const unwrapped = subject.replace(
    /^chore(\([^)]*\))?:\s+(?=(feat|fix|perf|refactor|docs|build|test|style|ci|chore)[!(:])/,
    '',
  )
  const m = unwrapped.match(
    /^(feat|fix|perf|refactor|docs|build|test|style|ci|chore)(\([^)]*\))?(!)?:/,
  )
  if (!m) return 'unknown' // ← surface these, don't silently drop
  const [, type, , breaking] = m
  if (breaking) return 'major'
  if (type === 'feat') return 'minor'
  if (['fix', 'perf', 'refactor', 'docs', 'build'].includes(type)) return 'patch'
  return 'none' // chore/test/style/ci
}
```

Also scan commit **bodies** for `BREAKING CHANGE:` — footer-declared breaks override subject classification to `major`.

### 0c. Findings to report

Print a compact markdown review to the user covering:

1. **Version proposal** — `CURRENT → NEXT` and which commits drove the highest bump.
   - **First-release note:** if `package.json` is `0.1.0` and this is the first release, propose `0.2.0` (minor) as the baseline unless the commit set contains only `chore:`/`ci:`/`test:` (then `0.1.1`).
2. **Unknown-classification commits** — subjects that didn't match any prefix. Kody's `Merge pull request #NNN from ...` merges usually fall here; flag anything else so it doesn't drop from the CHANGELOG.
3. **Breaking-change candidates** — any `feat!:`, `fix!:`, or `BREAKING CHANGE:` mention.
4. **Sensitive-path touches** — grep `FILES_CHANGED` for any of:
   - `src/server/aguy-web.ts` (the Web-API proxy — a bug here breaks every widget)
   - `src/types/dashboard-schema.ts` (Zod contract — see `0e` for the sibling-schema check)
   - `src/app/api/**/route.ts` (proxy routes — dashboard-metrics + logout)
   - `src/middleware.ts` (if it exists)
   - `next.config.js`
   - `tailwind.config.mjs`
   - `.env.example` or any `*.env*` file
   - `AGENTS.md` (repo contract — changes here need explicit user sign-off)
   - `package.json` dependencies (not the version line)

   For each match, name the file + the PR/commit.
5. **Env-var deltas** — grep for new `process.env.<VAR>` reads not on `main`. Vercel snapshots env vars at deploy-creation, so new variables must be added to the Vercel project dashboard **before** Stage 4 or the prod build silently reads `undefined`. Dash's current env surface is small: `AGUY_WEB_URL`, `AGUY_API_URL`, `DASHBOARD_PUBLIC_URL`.
6. **Trust-boundary violations** — re-run the preconditions grep against `FILES_CHANGED`. If any commit added a `mongodb` import, a `PAYLOAD_SECRET` read, or JWT verification code — halt. That's an AGENTS.md violation regardless of what else is going on.
7. **Open PRs targeting `dev` or `main`** — `gh pr list --base dev --state open` and `--base main`. A promotion PR conflicts if someone else has an open `dev → main` PR.
8. **CI health of `dev` HEAD** — `gh run list --branch dev --limit 5 --json name,conclusion,headSha`. Releasing on top of a red or in-flight run ships broken.
9. **Version drift** — compare `package.json` version, the latest `chore: release v` commit on `main`, and `git tag --sort=-v:refname | head -1`. Note any mismatch.
10. **Dependency changes** — `git diff LAST_RELEASE_SHA..origin/dev -- package.json pnpm-lock.yaml`. New prod deps can shift bundle size or introduce runtime surprises. Special attention to `@a-guy/ui` and `@a-guy/api-client` bumps — those come from `A-Guy-Shared` and are the coupling point with the platform.

### 0d. Sibling schema drift (Dash-specific)

Dash's [`src/types/dashboard-schema.ts`](../../../src/types/dashboard-schema.ts) mirrors Web's `/api/dashboard-metrics` response contract. If a field is added/removed here without a matching Web change, `safeParse` will reject every response and the entire dashboard 502s. This bit us on PR #13 review — reviewer caught it before merge.

**Check before releasing:**

```bash
# Any change to the schema this release?
SCHEMA_CHANGED=$(git diff "${LAST_RELEASE_SHA}..origin/dev" -- src/types/dashboard-schema.ts src/types/dashboard.ts | grep -c "^+")

if [ "$SCHEMA_CHANGED" -gt 0 ]; then
  echo "⚠ Zod/type schema changed. Verify Web is emitting the new/changed field:"
  echo "  1. Find new field names in the diff"
  echo "  2. Grep ../A-Guy-Web/src/server/services/dashboard/ for each"
  echo "  3. If Web's producer isn't updated + deployed to prod, either:"
  echo "     (a) hold the Dash release until Web ships, or"
  echo "     (b) verify the schema uses .default(...) for forward compatibility"
fi
```

Report to the user: which fields changed, whether Web appears to emit them (grep hits in `../A-Guy-Web/`), and whether the schema entry uses `.default(...)`. **Halt if a required (non-defaulted) field was added without evidence Web ships it.**

### 0e. Decision gate

Print the review as a compact markdown summary (bullets, not prose) and **wait for explicit confirmation** before running Stage 1. If the user says "go", proceed. If the user says "hold" or asks for changes, adjust and re-run Stage 0.

Do NOT auto-proceed even if every check is green — the review's value is the human beat, not just the checks.

---

## Stage 1 — `release-prepare`

Kody's `release-prepare` bumps `package.json`, rewrites the CHANGELOG, and opens a `chore: release vX.Y.Z` PR into `dev`. Replicate that here.

### 1a. Sync `dev`

```bash
git fetch origin dev
git checkout dev
git pull origin dev
```

### 1b. Determine the next version

Reuse the classifier from Stage 0b. Highest-priority bump wins.

- **First-release fallback:** if `package.json` is `0.1.0` and no `chore: release v` commit exists on `main`, use `0.2.0` (minor) for any feature-carrying release, `0.1.1` for maintenance-only.
- **Empty-classification fallback:** if every commit classifies as `none`, still ship a patch — Web/Admin do this too.

Bump `package.json` in-place:

```bash
NEXT=<computed>
node -e "const fs=require('fs');const p=require('./package.json');p.version='$NEXT';fs.writeFileSync('./package.json', JSON.stringify(p,null,2)+'\n');"
```

### 1c. Create or update the CHANGELOG

Dash has no `CHANGELOG.md` at time of writing — the first release creates it.

**If `CHANGELOG.md` does not exist:**

```markdown
# Changelog

All notable changes to A-Guy-Dash are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## vX.Y.Z — YYYY-MM-DD

### Features
- ...

### Bug Fixes
- ...
```

**If it exists:** prepend a new section directly after the top-level `# Changelog` line. Header format: `## vX.Y.Z — YYYY-MM-DD` (em-dash, ISO date). Group under `### Features`, `### Bug Fixes`, `### Performance`, `### Refactor`, `### Docs`. Skip empty sections. Strip conventional-commit prefixes from each subject; keep the human-readable part. If only `chore:`/`ci:`/`test:` commits, write `_Maintenance-only release._`.

### 1d. Open the release PR

```bash
BRANCH="release/v${NEXT}"
git checkout -b "$BRANCH"
git add package.json CHANGELOG.md
git commit -m "chore: release v${NEXT}" -m "Bumps package.json to ${NEXT} and updates CHANGELOG."
git push -u origin "$BRANCH"

gh pr create \
  --base dev \
  --head "$BRANCH" \
  --title "chore: release v${NEXT}" \
  --body "$(cat <<EOF
Automated release PR opened by the dash-release skill.

## v${NEXT} — $(date +%Y-%m-%d)

<paste the CHANGELOG section here>

The skill will merge this into \`dev\`, then open a promotion PR into \`main\`, then run \`vercel --prod\`.
EOF
)"
```

Capture the PR number as `RELEASE_PR`.

---

## Stage 2 — `release-merge`

Wait for CI on the release PR and merge it into `dev`.

```bash
gh pr checks "$RELEASE_PR" --watch --interval 15
gh pr merge "$RELEASE_PR" --squash --delete-branch
```

If CI fails, invoke `@kody fix-ci` on the PR and re-watch — do not merge with red checks.

Capture the merge SHA:

```bash
MERGE_SHA=$(gh pr view "$RELEASE_PR" --json mergeCommit --jq .mergeCommit.oid)
```

---

## Stage 3 — `release-promote`

Open a PR titled `promote: dev -> main (vX.Y.Z)` — same pattern as Web/Admin.

```bash
git fetch origin dev main
git checkout dev
git pull origin dev

gh pr create \
  --base main \
  --head dev \
  --title "promote: dev -> main (v${NEXT})" \
  --body "$(cat <<EOF
Automated release promotion PR opened by the dash-release skill — promotes \`dev\` to \`main\` for release **v${NEXT}**.

<!-- kody-changelog-start -->
## What's changing in v${NEXT}

<paste the CHANGELOG section again>
<!-- kody-changelog-end -->

Merge this PR to promote v${NEXT} to \`main\`.
EOF
)"
```

Capture as `PROMOTE_PR`. Wait for checks and merge with a **merge commit** (not squash — this preserves the promotion boundary that Stage 0a walks back to):

```bash
gh pr checks "$PROMOTE_PR" --watch --interval 15
gh pr merge "$PROMOTE_PR" --merge
```

Dash has no `vercel-deploy.yml` workflow — merging to `main` does NOT trigger a deploy. Stage 4 is what ships.

---

## Stage 4 — `vercel-production-deploy`

Unlike Admin (which has a GitHub-Actions vercel-deploy.yml that fires on push to main), Dash deploys purely via CLI. This stage is the actual release moment.

### 4a. Ensure the local checkout is at the tip of `main`

```bash
git checkout main
git pull origin main
```

### 4b. Run `vercel --prod`

Per the deploy ritual in [`../../../../CLAUDE_SHARED.md`](../../../../CLAUDE_SHARED.md):

```bash
vercel --prod --yes
```

`vercel --prod --yes` builds AND aliases in one step. **Do NOT** run `vercel alias` after this — that's only for the dev-alias flow. And **NEVER** alias a preview build to `dash.aguy.co.il` (that's the prod alias).

Build takes ~2–3 min for Dash (smaller than Web/Admin). Run in the foreground so the build output is visible; if it errors, the last lines are the diagnostic.

Wait for the deploy URL to appear, then confirm the alias landed:

```bash
vercel inspect <deploy-url> --scope aguy   # should show dash.aguy.co.il in the aliases list
```

---

## Stage 5 — Tag & GitHub release

Dash has no history of tagging (v0.1.0 was never tagged). Start the pattern now:

```bash
git tag -a "v${NEXT}" -m "Release v${NEXT}"
git push origin "v${NEXT}"

gh release create "v${NEXT}" \
  --title "v${NEXT}" \
  --notes "$(sed -n "/^## v${NEXT} /,/^## /p" CHANGELOG.md | sed '$d')" \
  --target main
```

For the first release ever, this also creates the first tag — no prior tags to compare against.

---

## Stage 6 — Verify on production

Two verification steps. Both are required — "merged to main + `vercel --prod` returned" is not "shipped." Real users hit `dash.aguy.co.il`; that's the surface to check.

### 6a. Smoke

Dash has no dedicated smoke script. Use targeted HTTP probes:

```bash
# / should serve the dashboard shell (200) OR redirect to Web's login (302 to www.aguy.co.il/login)
# Both are "OK" outcomes — logged-out anonymous request should not 500.
curl -sI https://dash.aguy.co.il/ | head -3

# /api/dashboard-metrics without a cookie should return 401 from Web via the proxy
curl -sI https://dash.aguy.co.il/api/dashboard-metrics | head -3

# /api/logout should return 405 for GET (POST-only)
curl -sI https://dash.aguy.co.il/api/logout | head -3
```

Expected outcomes:

- `/` → 200 or 302 (redirect to `www.aguy.co.il/login?returnTo=...`)
- `/api/dashboard-metrics` → 401 (Web rejects the request; proxy passes the status through)
- `/api/logout` → 405

Anything else (500, 502, 504, HTML error page) is a fail.

**Follow-up (nice to have):** write `scripts/smoke-dash.ts` that asserts the above outcomes + hits `/api/dashboard-metrics` with a real admin cookie from env var to validate the round-trip. Aligns with Web's `scripts/smoke-web-api.ts`.

### 6b. Version + deploy identity

```bash
# The prod deployment should serve x-vercel-id that matches the new deploy
curl -sSI https://dash.aguy.co.il/ | grep -i "x-vercel-id"

# Optional: hit a page and grep the rendered HTML for a build-time marker
curl -sS https://dash.aguy.co.il/ | grep -oE "buildId[\"']?:[\"']?[a-zA-Z0-9-]+" | head -1
```

If `x-vercel-id` matches a preview deploy ID or an older prod deploy, the alias didn't repoint — go back to Stage 4b and re-run `vercel --prod --yes`.

---

## Stage 7 — Close the loop

If a Kody goal issue is open, comment on it and close it:

```bash
GOAL_ISSUE=$(gh issue list --search "dash-release-$(date +%Y-%m-%d) in:body" --state open --json number --jq '.[0].number')

if [ -n "$GOAL_ISSUE" ]; then
  gh issue comment "$GOAL_ISSUE" --body "✅ v${NEXT} shipped: promotion PR #${PROMOTE_PR} merged, \`vercel --prod\` succeeded, smoke passed against dash.aguy.co.il."
  gh issue close "$GOAL_ISSUE" --reason completed
fi
```

Also update the auto-memory: bump the tail of `project_deploy_policy.md` (or wherever the last-known-shipped-version note lives) so the next session sees the fresh baseline.

---

## Failure handling

| Stage fails at                      | Action                                                                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preconditions                       | Surface the exact command that failed, do not proceed                                                                                                                                                                                                      |
| Stage 0 trust boundary              | Halt. AGENTS.md violation needs explicit user override — do not release code that added DB/auth/secrets to Dash                                                                                                                                            |
| Stage 0 sibling schema drift        | Halt. Coordinate with Web release — either delay Dash until Web's producer ships, or add `.default(...)` to the new schema field for forward-compat                                                                                                        |
| Stage 1 CI                          | Comment `@kody fix-ci` on the PR, re-watch, then merge                                                                                                                                                                                                     |
| Stage 3 CI                          | Same — `@kody fix-ci`, then merge                                                                                                                                                                                                                          |
| Stage 4 `vercel --prod` build error | Read the build log, fix on `dev`, re-promote, re-deploy — do NOT alias a broken build                                                                                                                                                                     |
| Stage 6 smoke fails                 | Deployment is live but broken. Roll back via `vercel rollback` (identify prior prod deploy via `vercel ls --prod --scope aguy`) and open a bug issue                                                                                                       |
| Stage 6 x-vercel-id mismatch        | The alias didn't repoint. Re-run `vercel --prod --yes` from `main`, or explicitly `vercel alias <deploy-url> dash.aguy.co.il --scope aguy` and re-verify                                                                                                   |

---

## Non-negotiables

- **Never alias a preview build to `dash.aguy.co.il`.** That's the prod alias. The rest of the alias/scope story is in [`../../../../CLAUDE_SHARED.md`](../../../../CLAUDE_SHARED.md).
- **Never skip Stage 0.** The pre-flight review is where the trust-boundary + sibling-schema-drift catches live — the two failure modes most likely to take Dash down.
- **Never skip Stage 6.** "Merged to main + vercel returned" is not "shipped." Users hit `dash.aguy.co.il`; check the alias landed there.
- **Never squash-merge the promotion PR.** Merge commit preserves the promotion boundary — Stage 0a walks `git log` back to the previous release commit.
- **Never bump `package.json` on `dev` without opening a release PR.** All version changes go through Stage 1.
- **Never push or PR directly to `main`.** All feature work + releases route through `dev`. The `promote: dev -> main` PR in Stage 3 is the ONLY thing that ever targets `main`.
- **Never add DB/auth/secrets to Dash under any circumstances.** AGENTS.md is the contract; the preconditions grep is the guardrail.

---

## Keeping this in sync with `web-release` / `admin-release`

Forked from [`../../../../A-Guy-Admin/.claude/skills/admin-release/SKILL.md`](../../../../A-Guy-Admin/.claude/skills/admin-release/SKILL.md), which was itself forked from [`../../../../A-Guy-Web/.agents/skills/web-release/SKILL.md`](../../../../A-Guy-Web/.agents/skills/web-release/SKILL.md). Pipeline logic (Stages 0–7) is meant to stay identical across the three repos. Dash's differences:

- **No Docker/Render stage** — Vercel is the only prod surface. Admin's Stage 4.5 is dropped entirely.
- **No vercel-deploy.yml workflow** — Dash deploys purely via CLI in Stage 4. Admin has a workflow that fires on push to main; Dash doesn't.
- **Trust-boundary precondition** — Dash's AGENTS.md forbids DB/auth/secrets. Web/Admin don't have this constraint (they ARE the DB/auth surface).
- **Sibling-schema-drift check (Stage 0d)** — Dash-specific. The Zod schema mirrors Web's producer; drift breaks the whole dashboard. Web/Admin own their own contracts, no upstream to coordinate with.
- **Smoke script** — Web has `scripts/smoke-web-api.ts`, Admin has curl probes, Dash also uses curl probes. Writing `scripts/smoke-dash.ts` is a nice-to-have follow-up.
- **First-release handling** — Dash starts from v0.1.0 with no CHANGELOG. Web/Admin are past this phase.
- **Sensitive-path list (Stage 0c)** — Dash's list is much shorter (proxy, schema, routes, config). Web/Admin have collection/webhook/payment paths.

When Web or Admin's skill improves (better classifier, new pre-flight check), port the change here — don't let the three drift.
