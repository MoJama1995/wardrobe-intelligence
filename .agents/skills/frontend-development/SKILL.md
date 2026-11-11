---
name: frontend-development
description: Build or change the React + TypeScript (Vite) frontend in apps/web for Wardrobe Intelligence, covering components, hooks, API client usage, image upload flows, loading, error and empty states, accessibility, and Vitest + Testing Library tests. Use for any work under apps/web.
---

# Frontend development (apps/web)

Stack: React 19, TypeScript 7 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`),
Vite, Vitest + Testing Library, oxlint, Prettier. See `docs/decisions/0004-frontend-tooling.md` for
why oxlint is used instead of ESLint.

## Layout

| Path | Contains |
| --- | --- |
| `src/features/<feature>/` | the feature's components, hooks and tests, together |
| `src/components/` | shared presentational components, only once two or more features use one |
| `src/lib/api/client.ts` | the only place that calls `fetch` |
| `src/lib/api/schema.gen.ts` | **generated** from `services/api/openapi.json`. Never edit it |

Pattern to copy: `src/features/system-status/` (a hook returning a discriminated union, a component
that renders each state, and a test that stubs `fetch`).

## Rules

- **API types** come from `schema.gen.ts`. If the backend changes, run `npm run gen:api`. Never
  hand-write a type the API defines.
- **Data fetching** lives in hooks that return `{status: 'loading' | 'success' | 'error' ...}` and
  abort on unmount. Components never call `fetch`.
- **Every async view** renders loading, error, empty and success states. Uploads add: validating
  locally → uploading (progress) → processing → done or failed (retryable).
- **State:** local first, then lift when shared, then React context only for truly global state.
  No Redux, Zustand or TanStack Query until a demonstrated need, and then propose it in an ADR.
- **Upload UX:** check type and size client-side before uploading, preview with
  `URL.createObjectURL` and **revoke** the URL on cleanup, prevent double submits, and show the
  `requestId` from `ApiError` in error messages.
- **Accessibility:** semantic elements, labelled inputs, `role="status"` / `role="alert"` for async
  feedback, keyboard operability, and meaningful `alt` text for garment images.
- **TypeScript:** no `any` and no unproven `!` assertions. Use `unknown` and narrow.
- **Styling:** plain CSS (`index.css`, CSS Modules if needed). No UI kit without an ADR.
- **Configuration:** only `VITE_*` variables reach the browser, so never put secrets there.

## Testing

- Test behaviour the user can see, querying by role or text.
- Stub at the network boundary (`vi.stubGlobal('fetch', ...)`) or at the `lib/api` functions.
- Add `@testing-library/user-event` with the first interactive feature.
- Test each UI state: loading, success, empty, error.
- Avoid snapshot tests of whole trees.

## Workflow

1. Regenerate types if the API changed → 2. write or adjust the `lib/api` function → 3. hook with
explicit states → 4. component → 5. tests per state → 6. `npm run lint && npm run typecheck &&
npm test`.

## Common mistakes

- Unhandled promise rejections in effects (always `.catch`), and setting state after unmount.
- `useEffect` dependency arrays that silence the linter instead of fixing the dependency.
- Object URLs created for previews and never revoked, which leaks memory.
- Treating `204` or empty lists as errors. Empty is a valid state with its own UI.
