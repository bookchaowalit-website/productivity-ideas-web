# Idea Field

A browser-local idea notebook: three authored sample thoughts, plus your own with a title, a working note and a
signal (Seed, Shaping, Testing, Parked). Search, filter by signal, open one thought in the reading panel and remove
it. Thoughts are kept in this browser's localStorage only.

Live: https://ideas.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does not do

- No visitor submissions, upvoting, scoring, ranking or roadmap. No AI.
- No account, sync, export or server storage. Clearing site data removes your thoughts.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: idea logic, stored-state hook, MCP route, home page render, Sentry scrubbing
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Code map

- `lib/ideas.ts`: sample thoughts, `parseIdeas` (rejects corrupt or wrongly shaped storage), `filterIdeas`,
  `pickSelected`, `createIdea`, `removeIdea`, `signalBars`.
- `lib/use-stored-state.ts`: localStorage-backed state via `useSyncExternalStore` (server render uses the sample).
- `app/api/mcp/route.ts`: stateless JSON-RPC endpoint with `get_all`, `get_by_id` and `search` over the sample
  thoughts (a visitor's own thoughts never leave the browser).
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped; off when
  `NEXT_PUBLIC_SENTRY_DSN` is unset.
- `app/more-projects/page.tsx`: shared portfolio link page (copied per repository, not a package).
