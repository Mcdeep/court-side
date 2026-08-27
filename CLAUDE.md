<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Local development

Two processes, run together (or via `npm run dev:zellij`):

- `npx convex dev` — pushes Convex functions and watches for changes.
- `npm run dev` — Vite dev server on port 3000.

The dev Convex deployment needs its own `CLERK_SECRET_KEY` set (separate
from prod) for any Clerk-backed action (org creation, assign admin, list
admins) to work locally: `npx convex env set CLERK_SECRET_KEY <sk_test_...>`.
Check with `npx convex env list` if those actions fail with
"CLERK_SECRET_KEY not configured".

Known gotchas on this machine:

- **Vite HMR log loop**: `npm run dev` can spew gigabytes/sec to its log
  and OOM the machine. Watch log size after connecting a browser tab.
- **Playwright MCP is broken** (FD issue) — use Claude in Chrome +
  native Chromium for browser automation instead.

## Workflow: don't push directly to main

Netlify auto-deploys prod (`npx convex deploy` + site build) on every push
to `main`. Push a branch and open a PR instead; merge to main only when
it's ready to ship.

Real GitHub branch protection isn't available (private repo, free plan
needs GitHub Pro to enable it), so this is enforced locally, best-effort:
a `pre-push` hook in `.githooks/` blocks direct pushes to `main`. Enable it
once per clone:

```
git config core.hooksPath .githooks
```

Deliberate bypass: `git push --no-verify`.

## Change log

`CHANGELOG.md` is generated from git history (Keep a Changelog format),
not hand-written. Commit subjects are categorized by leading verb (or a
conventional-commit prefix like `feat:`/`fix:` if used).

- `npm run changelog` — regenerate the `[Unreleased]` section from commits
  since the last version tag.
- `npm run changelog:release <version>` — cut a dated `[version]` section
  from `[Unreleased]` (e.g. `npm run changelog:release 0.2.0`), then tag
  the release: `git tag -a v0.2.0 -m "..."`.
