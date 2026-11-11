# Course viewer

A small web app for working through the course in `learning/`: one part of a lesson at a time,
questions you answer in the page, the answer key revealed only after you've answered, and a
progress tracker. It reads the same Markdown files you can read on GitHub or in your editor.

It's a standalone tool for the course, not part of the product. The Makefile, CI and `apps/web`
don't use it.

## Run it

```bash
cd learning/app
npm install          # first time only
npm run dev
```

Then open <http://localhost:5174>. (The product's frontend uses port 5173, so both can run at
once.) Edits to lessons show up as soon as you save them.

## How it works

| Feature | How |
| --- | --- |
| Lessons | `learning/lessons/*.md`, sorted by file name. Each `##` heading is one step. |
| Questions | Open questions get a text box. "Compare with the answer key" unlocks once you've written something. Multiple-choice questions give feedback as soon as you choose. |
| Answer keys | `learning/answers/*.md`. Each question shows only its own section. |
| Challenges | The worked solution appears after you tick "I've had a go". |
| Links | Links to lessons and answer keys stay in the app. Links to other repository files open in VS Code (`vscode://file/...`). External links open in a new tab. |
| Progress | Saved in **this browser only** (localStorage). `learning/PROGRESS.md` is the shared record: on the home page, **Copy progress as checklist**, paste it into `PROGRESS.md`, and commit it on a branch. |

If your browser blocks local storage (some private windows), the viewer still works, but nothing is
saved between visits.

## For lesson authors

The viewer parses the formats in [`learning/AUTHORING.md`](../AUTHORING.md): `**Question N.**`
paragraphs, `- a)` options, `### Question N:` answer sections and `**Answer: x)`. Check your
lesson before you commit it:

```bash
npm run check-content   # every lesson and answer key, with the same parser the viewer uses
```

## Develop

```bash
npm run typecheck
npm test               # parser, link and progress unit tests
npm run build          # static build in dist/ (not needed to use the course)
```

| Path | What |
| --- | --- |
| `src/lib/parse.ts` | lessons → steps → blocks; answer keys → sections. Pure functions. |
| `src/lib/links.ts` | routes (`#/lesson/<slug>/<step>`) and link rewriting |
| `src/lib/progress.ts` | progress counting and the checklist export |
| `src/content.ts` | loads the Markdown at build time with `import.meta.glob` |
| `src/components/` | React components |
| `scripts/check-content.ts` | the content check |

Dependencies are deliberately few: React and Vite (the same versions as `apps/web`), and
[marked](https://marked.js.org) for Markdown.
