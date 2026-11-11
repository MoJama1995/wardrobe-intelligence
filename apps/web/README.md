# apps/web

React 19 + TypeScript 7 + Vite frontend for Wardrobe Intelligence.

## Run and test

```bash
npm ci
npm run dev          # http://localhost:5173, /api/* proxied to services/api on :8000
npm test             # Vitest + Testing Library
npm run lint         # oxlint (see docs/decisions/0004-frontend-tooling.md)
npm run typecheck    # tsc -b
npm run format       # Prettier (format:check in CI)
npm run build
```

## Structure

| Path                        | Purpose                                                                        |
| --------------------------- | ------------------------------------------------------------------------------ |
| `src/features/<feature>/`   | a feature's components, hooks and tests, together                              |
| `src/lib/api/client.ts`     | the only place that calls `fetch`; throws `ApiError`                           |
| `src/lib/api/schema.gen.ts` | **generated** from `services/api/openapi.json` (`npm run gen:api`). Don't edit |
| `src/test/setup.ts`         | Testing Library setup                                                          |

`src/features/system-status/` is the reference pattern: a hook with explicit states, a component
that renders each state, and tests for each.

Conventions: `.agents/skills/frontend-development/SKILL.md`.

## Configuration

`VITE_API_BASE_URL` is the absolute API URL for deployed builds; locally, leave it unset to use the
dev proxy. See `.env.example`. Only `VITE_*` values reach the browser, so never put secrets in them.
