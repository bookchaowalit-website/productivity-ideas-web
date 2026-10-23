# Idea Field — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `ideas`, evidence Prototype) on 2026-10-23.

## What it is

A single-user, client-side notebook for loose ideas, seeded with three authored sample thoughts.

## Who it is for

A portfolio visitor (or the owner) who wants a quiet place to park a thought and give it a state.

## What works today

1. Add a thought (title required; an empty note gets a placeholder). New thoughts go on top and open in the reading
   panel.
2. Search title, note or signal (case-insensitive) and filter by All, Seed, Shaping, Testing or Parked.
3. Open a thought in the reading panel; remove it, and the panel moves to the first remaining thought.
4. Thoughts persist in this browser's localStorage. Corrupt or wrongly shaped stored data falls back to the sample
   instead of crashing the page.
5. `/api/mcp` answers JSON-RPC with `get_all`, `get_by_id` and `search` over the sample thoughts only.
6. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No visitor submissions, upvoting or community-driven prioritisation (claims removed from the portfolio card in the
  2026-10 review). The page says "No scoring, no fake roadmap".
- No editing of an existing thought's text or signal, no sync or export. No product analytics beyond Vercel
  Analytics.

## Live URL and deploy state

- Live: https://ideas.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-ideas-frontend` is deployed only by CLI (last production 2026-10-23 12:11, CLI
  deploy of commit ac3c674, the Next 16.4.2 security patch) and its Git link names the old repository
  `bookchaowalit/bookchaowalit-ideas-frontend`, so a push to `main` does not deploy. The live site lags `main`
  (template MCP route, no storage validation, layout overflow at phone width, no Sentry) until the owner reconnects
  Vercel Git to this repository (owner action D9). `NEXT_PUBLIC_SENTRY_DSN` is already set on the Vercel project
  (Sentry project `productivity-ideas-web`, org `personal-yu0`).

## Boundaries

- Browser-only apart from the stateless `/api/mcp` route.
