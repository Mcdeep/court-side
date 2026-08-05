<!-- intent-skills:start -->
# Skill mappings - load `use` with `pnpm dlx @tanstack/intent@latest load <use>`.
skills:
  - when: "Install TanStack Devtools, pick framework adapter (React/Vue/Solid/Preact), register plugins via plugins prop, configure shell (position, hotkeys, theme, hideUntilHover, requireUrlFlag, eventBusConfig). TanStackDevtools component, defaultOpen, localStorage persistence."
    use: "@tanstack/devtools#devtools-app-setup"
  - when: "Publish plugin to npm and submit to TanStack Devtools Marketplace. PluginMetadata registry format, plugin-registry.ts, pluginImport (importName, type), requires (packageName, minVersion), framework tagging, multi-framework submissions, featured plugins."
    use: "@tanstack/devtools#devtools-marketplace"
  - when: "Build devtools panel components that display emitted event data. Listen via EventClient.on(), handle theme (light/dark), use @tanstack/devtools-ui components. Plugin registration (name, render, id, defaultOpen), lifecycle (mount, activate, destroy), max 3 active plugins. Two paths: Solid.js core with devtools-ui for multi-framework support, or framework-specific panels."
    use: "@tanstack/devtools#devtools-plugin-panel"
  - when: "Handle devtools in production vs development. removeDevtoolsOnBuild, devDependency vs regular dependency, conditional imports, NoOp plugin variants for tree-shaking, non-Vite production exclusion patterns."
    use: "@tanstack/devtools#devtools-production"
  - when: "Two-way event patterns between devtools panel and application. App-to-devtools observation, devtools-to-app commands, time-travel debugging with snapshots and revert. structuredClone for snapshot safety, distinct event suffixes for observation vs commands, serializable payloads only."
    use: "@tanstack/devtools-event-client#devtools-bidirectional"
  - when: "Create typed EventClient for a library. Define event maps with typed payloads, pluginId auto-prepend namespacing, emit()/on()/onAll()/onAllPluginEvents() API. Connection lifecycle (5 retries, 300ms), event queuing, enabled/disabled state, SSR fallbacks, singleton pattern. Unique pluginId requirement to avoid event collisions."
    use: "@tanstack/devtools-event-client#devtools-event-client"
  - when: "Analyze library codebase for critical architecture and debugging points, add strategic event emissions. Identify middleware boundaries, state transitions, lifecycle hooks. Consolidate events (1 not 15), debounce high-frequency updates, DRY shared payload fields, guard emit() for production. Transparent server/client event bridging."
    use: "@tanstack/devtools-event-client#devtools-instrumentation"
  - when: "Configure @tanstack/devtools-vite for source inspection (data-tsd-source, inspectHotkey, ignore patterns), console piping (client-to-server, server-to-client, levels), enhanced logging, server event bus (port, host, HTTPS), production stripping (removeDevtoolsOnBuild), editor integration (launch-editor, custom editor.open). Must be FIRST plugin in Vite config. Vite ^6 || ^7 only."
    use: "@tanstack/devtools-vite#devtools-vite-plugin"
  - when: "Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, middleware conversion, data fetching pattern changes."
    use: "@tanstack/react-start#lifecycle/migrate-from-nextjs"
  - when: "React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup with React, useServerFn hook."
    use: "@tanstack/react-start#react-start"
  - when: "Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServerComponent, createCompositeComponent, CompositeComponent, renderToReadableStream, createFromReadableStream, createFromFetch, Composite Components, React Flight streams, loader or query owned RSC caching, router.invalidate, structuralSharing: false, selective SSR, stale names like renderRsc or .validator, or migration from Next App Router RSC patterns. Do not use for generic SSR or non-TanStack RSC frameworks except brief comparison."
    use: "@tanstack/react-start#react-start/server-components"
  - when: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
    use: "@tanstack/router-core#router-core"
  - when: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
    use: "@tanstack/router-core#router-core/auth-and-guards"
  - when: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
    use: "@tanstack/router-core#router-core/code-splitting"
  - when: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
    use: "@tanstack/router-core#router-core/data-loading"
  - when: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
    use: "@tanstack/router-core#router-core/navigation"
  - when: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
    use: "@tanstack/router-core#router-core/not-found-and-errors"
  - when: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
    use: "@tanstack/router-core#router-core/path-params"
  - when: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
    use: "@tanstack/router-core#router-core/search-params"
  - when: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
    use: "@tanstack/router-core#router-core/ssr"
  - when: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
    use: "@tanstack/router-core#router-core/type-safety"
  - when: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
    use: "@tanstack/router-plugin#router-plugin"
<!-- intent-skills:end -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

---

# CourtOS — Agent & Developer Reference

Padel tournament SaaS. Multitenant: each Organisation owns venues and tournaments. Seven formats supported. Real-time via Convex.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start (React 19, file-based routing) |
| Backend / Realtime | Convex ^1.41.0 |
| Auth | Clerk |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (Radix primitives) |
| Data tables | TanStack Table |
| Package manager | **npm** (never pnpm/yarn) |
| Hosting | Netlify |

---

## Project Structure

```
src/
├── components/
│   ├── app-dialog.tsx          # House-style Dialog wrapper — use for ALL modals
│   └── ui/                     # shadcn/ui + custom primitives
│       ├── button.tsx          # cva variants: primary, ink, ghost, outline, link
│       ├── icon.tsx            # Icon + IconName type (SVG path registry)
│       ├── avatar.tsx          # Avatar + initials()
│       ├── field.tsx           # Label wrapper for form inputs
│       ├── status-chip.tsx     # draft / live / completed / scheduled / final
│       ├── seg-tabs.tsx        # Pill tab switcher
│       ├── team-mark.tsx       # Overlapping avatars for a pair
│       ├── join-qr.tsx         # JoinQR + JoinQRButton
│       └── ...                 # alert-dialog, dialog, input, badge, card, table, tabs, dropdown-menu
│
├── features/                   # Domain sub-components (not pages)
│   ├── tournaments/
│   │   ├── types.ts            # Tournament, Match, Round, Participant, LeaderboardEntry
│   │   ├── schedule-tab.tsx
│   │   ├── participants-tab.tsx
│   │   ├── standings-tab.tsx
│   │   ├── score-modal.tsx
│   │   ├── add-player-modal.tsx
│   │   ├── edit-tournament-modal.tsx
│   │   ├── new-tournament-modal.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── match-cell.tsx
│   │   └── overflow-menu.tsx
│   ├── courts/
│   │   ├── types.ts            # Venue
│   │   ├── venue-card.tsx
│   │   └── venue-modal.tsx
│   └── admin/
│       ├── types.ts            # OrgWithStats, UserRecord
│       ├── orgs-tab.tsx
│       ├── users-tab.tsx
│       └── create-org-dialog.tsx
│
├── hooks/
│   └── use-async-action.ts     # { working, error, setError, run } — replaces saving/error/try-catch
│
├── lib/
│   ├── constants.ts            # POINTS_TO_WIN, PRE_GENERATED_FORMATS
│   ├── format.ts               # formatDate(), toDatetimeLocal()
│   ├── names.ts                # participantName(), pairNames(), lastName()
│   └── utils.ts                # cn() (clsx + tailwind-merge)
│
└── routes/                     # Thin shells ~100 lines each
    ├── __root.tsx
    ├── index.tsx               # Landing / sign-in
    ├── dashboard.tsx           # Member dashboard
    ├── admin.tsx               # Super admin (platform-wide)
    ├── $slug.tsx               # Org layout shell
    ├── $slug/
    │   ├── tournaments/
    │   │   ├── index.tsx       # Tournament list
    │   │   └── $tournamentId.tsx  # Tournament detail
    │   ├── courts.tsx
    │   ├── players.tsx
    │   ├── rankings.tsx
    │   └── settings.tsx
    ├── join/$tournamentId.tsx  # Public QR self-join
    └── kiosk/$tournamentId.tsx # Public kiosk display (no auth)

convex/                         # Backend — Convex functions
├── schema.ts                   # Source of truth for all table shapes
├── tournaments.ts
├── participants.ts
├── rounds.ts
├── matches.ts
├── leaderboard.ts
├── venues.ts
├── organizations.ts
├── users.ts
├── scores.ts
├── clerkActions.ts             # Clerk org/user management (useAction, not useMutation)
└── formats/                    # Round-generation algorithms per format
    ├── americano.ts
    ├── mexicano.ts
    ├── round_robin.ts
    ├── knockout.ts
    ├── king_of_the_court.ts
    └── snakes_and_ladders.ts
```

---

## Path Aliases

```ts
'#/*'  →  './src/*'   // use for all new code
'@/*'  →  './src/*'   // shadcn-generated imports use this — both resolve identically
```

---

## Convex Rules

**Always read `convex/_generated/ai/guidelines.md` before editing any Convex file.**

- Queries/mutations live in `convex/*.ts` only — no backend logic in `src/`.
- `useQuery`, `useMutation`, `useAction` from `convex/react` in React components.
- Use `useAction` (not `useMutation`) for `clerkActions.ts` — they run in Node.js.
- Derive prop types from Convex return types — never redeclare field shapes manually.
- `convex/schema.ts` is the source of truth — check it before assuming field names.
- Run `npx convex dev` to push schema + functions in watch mode.

---

## Design System

One system: **shadcn/ui**. Never write hand-rolled modal or form shells.

### shadcn-first: check before you build

Before writing any new UI primitive (a picker, a toggle group, a combobox,
anything that isn't page-specific layout), check whether shadcn already has
it:

1. Search the registry — `mcp__shadcn__search_items_in_registries` or
   `mcp__shadcn__list_items_in_registries`.
2. If it exists, install it: `npx shadcn@latest add @shadcn/<name>`. If the
   CLI prompts to overwrite a file we've already customised (`button.tsx`,
   `input.tsx`, etc.), answer **no** — keep our version.
3. Re-skin the installed component with our theme tokens (below) rather
   than shipping its default shadcn look — see e.g. `sidebar.tsx`'s
   `--sidebar-*` overrides in `styles.css`, or `new.tsx`'s `ToggleGroup`
   duration pills.
4. Only hand-roll a component when shadcn genuinely has no equivalent
   (`icon.tsx`, `status-chip.tsx`, `team-mark.tsx`, `join-qr.tsx` are the
   existing examples — all domain-specific, not generic UI).

Existing installed primitives live in `src/components/ui/` — check there
first too; a lot of the common ones (`button`, `input`, `dialog`,
`dropdown-menu`, `tabs`, `toggle-group`, `sidebar`, `tooltip`, `sheet`,
`separator`, `command`, `avatar`, `badge`, `card`, `table`, `alert-dialog`,
`field`, `label`, `skeleton`) are already in.

### Button variants
```tsx
<Button variant="primary" />   // green accent fill — primary CTA
<Button variant="ink" />       // dark fill — secondary CTA
<Button variant="outline" />   // ring border, transparent bg
<Button variant="ghost" />     // no border, subtle hover
```
Button also accepts `icon` / `iconR` props (type `IconName`) that render an `<Icon>` inside.

### Icon
```tsx
import { Icon } from '#/components/ui/icon'
<Icon name="plus" className="w-4 h-4" stroke={2.4} />
```
`name` is typed as `IconName`. Add new icons to the `PATHS` record in `icon.tsx`.

### Modals — always use AppDialog
```tsx
import { AppDialog } from '#/components/app-dialog'

<AppDialog
  open={open}
  onOpenChange={onOpenChange}
  title="Edit something"
  description="Optional subtitle"
  maxWidth="sm:max-w-[480px]"
  footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary">Save</Button></>}
>
  {/* form content */}
</AppDialog>
```
For destructive confirmations use shadcn `AlertDialog` directly (or `ConfirmDialog` in `#/features/tournaments/confirm-dialog`).

### Forms
```tsx
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'

<Field label="Venue name">
  <Input value={name} onChange={e => setName(e.target.value)} required />
</Field>
```
Never use raw `<input>` with a hand-rolled class string. Always `<Input>` from shadcn.

### Theme tokens — never hardcode a colour

All colours are CSS custom properties defined once in `src/styles.css`
(`:root`) and exposed as Tailwind utilities via `@theme`. Every component —
shadcn-installed or hand-rolled — must use these, not arbitrary hex/oklch
values or one-off `text-[#...]` classes.

| Token | Utility | Use |
|---|---|---|
| `--ink` | `bg-ink`, `text-ink` | Primary text / dark surfaces (sidebar, kiosk) |
| `--ink-soft` | `bg-ink-soft` | Slightly lighter dark surface (hover on ink bg) |
| `--ink-line` | `border-ink-line` | Dividers on dark surfaces |
| `--ink-mute` | `text-ink-mute` | Secondary/muted text |
| `--paper` | `bg-paper`, `text-paper` | Page background / text-on-dark |
| `--accent` | `bg-accent`, `text-accent` | Brand green — primary actions, live indicators |
| `--accent-dark` | `text-accent-dark`, `ring-accent-dark/40` | Focus rings, pressed accent states |
| `--accent-soft` | `bg-accent-soft` | Accent-tinted backgrounds (selected cards, badges) |
| `--sidebar-*` | `bg-sidebar`, `text-sidebar-foreground`, etc. | shadcn Sidebar internals — already wired to ink/paper/accent, don't override per-usage |

Neutrals: use Tailwind's built-in `zinc-*` scale for secondary chrome
(borders, disabled states, skeletons) — don't invent a second grey scale.

Rules:
- **No violet or purple anywhere.**
- Never write `bg-[#...]`, `bg-[oklch(...)]`, or similar inline colour
  literals in a component. If the palette is missing a shade you need, add
  it to `:root` in `styles.css` and consume it as a token — don't patch
  around it locally.
- When installing/re-skinning a shadcn component, map its CSS vars to ours
  (see `--sidebar-*` mapping in `styles.css` as the template) instead of
  leaving shadcn's default zinc/slate values in place.
- Dark surfaces: `bg-ink text-paper`. Muted text: `text-ink-mute`.

---

## Async Mutations — useAsyncAction

Use for every component that calls a mutation. Never inline `saving`/`error`/`try-catch`.

```tsx
import { useAsyncAction } from '#/hooks/use-async-action'

const { working, error, setError, run } = useAsyncAction()

async function submit(e: React.FormEvent) {
  e.preventDefault()
  if (!name.trim()) { setError('Name required'); return }
  await run(async () => {
    await doMutation({ ... })
    onClose()
  })
}

// In JSX:
// {error && <p className="text-red-500 text-sm">{error}</p>}
// <Button disabled={working}>{working ? 'Saving…' : 'Save'}</Button>
```

---

## Typing

Derive component prop types from Convex return types — never rewrite field shapes:

```ts
// src/features/<domain>/types.ts
import type { FunctionReturnType } from 'convex/server'
import type { api } from '#/../convex/_generated/api'

export type Match = FunctionReturnType<typeof api.matches.listByRound>[number]
export type Tournament = NonNullable<FunctionReturnType<typeof api.tournaments.get>>
```

- `catch (e: any)` is acceptable in catch blocks.
- No other `any` in feature files.
- `npx tsc --noEmit` must pass clean after every change.

---

## Route Files

Routes are **thin shells** (~100 lines). They:
1. Call `useQuery`/`useMutation` at the top level
2. Hold page-level UI state (active tab, which modal is open)
3. Compose feature components

Anything requiring >~30 lines of implementation belongs in `src/features/<domain>/`.

---

## Shared Utilities Quick Reference

| Utility | Location | Use |
|---|---|---|
| `formatDate(ms)` | `#/lib/format` | en-ZA short date |
| `toDatetimeLocal(ms)` | `#/lib/format` | `datetime-local` input value |
| `participantName(p)` | `#/lib/names` | `user.name ?? walkInName ?? '?'` |
| `pairNames(pair)` | `#/lib/names` | `[string, string]` for both players |
| `lastName(name)` | `#/lib/names` | Last word of full name |
| `POINTS_TO_WIN` | `#/lib/constants` | `24` |
| `PRE_GENERATED_FORMATS` | `#/lib/constants` | `['americano', 'round_robin']` |

---

## Domain Concepts

| Concept | Notes |
|---|---|
| Organisation | Tenant. URL slug used in `/$slug/...`. Has `active`/`suspended` status. |
| Venue | Physical facility under an org. Has `courtCount`. |
| Tournament | Scoped to org + venue. Has format + lifecycle state. |
| Format | `americano`, `mexicano`, `round_robin`, `knockout`, `king_of_the_court`, `snakes_and_ladders`, `team_clash` |
| Tournament state | `draft → registration_open → in_progress → completed → archived` |
| Participant | Member (`userId` set) or walk-in (`walkInName` set, `isWalkIn: true`). |
| Pair | Two participants assigned to play together in a match. |
| Round | Ordered set of matches. State: `pending → in_progress → completed`. |
| Match | Pair A vs Pair B on a numbered court. Has `scoreA`, `scoreB`, `state`. |
| Leaderboard | Per-tournament: `points`, `wins`, `losses` per participant. |

---

## Codegraph

If a `.codegraph/` directory exists at the repo root, the workspace is indexed and codegraph tools are available. Use them to navigate the codebase efficiently before editing.

```bash
# Check whether the index exists
ls .codegraph/
```

When indexed, prefer codegraph over grep for:
- Finding where a symbol is defined (`codegraph find <symbol>`)
- Listing all references to a component or hook
- Answering "which files import X" questions

When **not** indexed (no `.codegraph/` directory), fall back to `grep`/`find` as normal. Do not run `codegraph init` yourself — that is the developer's decision.

---

## Commands

```bash
npm run dev          # Vite dev server on :3000
npx convex dev       # Push schema + functions, watch mode
npx tsc --noEmit     # Type-check — must be clean before committing
npm test             # Vitest unit tests
npm run test:e2e     # Playwright E2E
npm run build        # Production build
```

---

## General Coding Practices

- **No comments** unless the WHY is non-obvious (hidden constraint, workaround for a specific bug).
- **No purple/violet** in UI — green accent palette only.
- Each feature file exports one named component. Keep them single-purpose.
- No `any` outside catch blocks. Let TypeScript infer; use Convex-derived types.
- No premature abstractions. Three similar lines are better than a wrong abstraction.
- No error handling for scenarios that can't happen. Trust internal guarantees.
- TSC must pass clean after every change.
- Commit messages end with `Co-Authored-By:` trailer.
