# 0004: Frontend tooling: TypeScript 7 and oxlint instead of ESLint

- **Status:** accepted
- **Date:** 2026-11-10

## Context

The original plan named ESLint. When the frontend was scaffolded, the official Vite React template
(create-vite 9.3.4) shipped **TypeScript 7** and **oxlint**, and `typescript-eslint` 8.72.2 declared
`typescript: ">=4.8.4 <6.1.0"` as its peer range (checked 2026-11-10). ESLint with type-aware
TypeScript rules therefore meant pinning an older TypeScript.

## Decision

Use TypeScript 7 and oxlint (the template defaults), plus Prettier for formatting.
`.oxlintrc.json` enables the correctness category as errors, the suspicious category as warnings
(the lint script fails on warnings), and React hooks rules, including `exhaustive-deps`, which we
checked with a deliberate violation.

## Alternatives considered

| Option | Why not |
| --- | --- |
| ESLint + typescript-eslint on TypeScript ≤ 6.0 | Pins an older compiler for a greenfield project; slower in the per-edit hook |
| Biome | Also viable; oxlint is the Vite default and covers the React rules we need |

## Consequences

- Linting is fast enough to run on every edit in the Claude Code hook.
- Some ESLint plugins have no oxlint equivalent. Revisit if we need one, or when typescript-eslint
  supports TypeScript 7.
