import { describe, expect, it } from 'vitest'
import { renderInlineMarkdown, renderMarkdown } from './markdown.ts'

const LESSON = 'learning/lessons/01-git.md'

describe('renderMarkdown', () => {
  it('rewrites links as it renders', () => {
    const html = renderMarkdown(
      '[key](../answers/01-git.md) and [ignore](../../.gitignore)',
      LESSON,
      '/r',
    )
    expect(html).toContain('href="#/answers/01-git"')
    expect(html).toContain('href="vscode://file/r/.gitignore"')
  })

  it('passes <details> through and still renders the markdown inside it', () => {
    const html = renderMarkdown(
      '<details>\n<summary>Hint 1</summary>\n\nUse **git log**.\n</details>',
      LESSON,
      '/r',
    )
    expect(html).toContain('<details>')
    expect(html).toContain('<strong>git log</strong>')
  })

  it('renders inline markdown without a paragraph', () => {
    expect(renderInlineMarkdown('run `git status`', LESSON, '/r')).toBe(
      'run <code>git status</code>',
    )
  })
})
