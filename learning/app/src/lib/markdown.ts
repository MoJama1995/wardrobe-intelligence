import { Marked } from 'marked'
import { resolveHref } from './links.ts'

function markedFor(fromPath: string, repoRoot: string): Marked {
  return new Marked({
    gfm: true,
    async: false,
    walkTokens(token) {
      if (token.type === 'link')
        token.href = resolveHref(token.href, fromPath, repoRoot)
    },
  })
}

/**
 * Markdown to HTML. Raw HTML such as `<details>` passes through: the content is the course's own
 * files in this repository, not user input.
 */
export function renderMarkdown(
  text: string,
  fromPath: string,
  repoRoot: string,
): string {
  return markedFor(fromPath, repoRoot).parse(text, { async: false })
}

export function renderInlineMarkdown(
  text: string,
  fromPath: string,
  repoRoot: string,
): string {
  return markedFor(fromPath, repoRoot).parseInline(text, { async: false })
}
