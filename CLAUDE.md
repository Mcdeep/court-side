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
