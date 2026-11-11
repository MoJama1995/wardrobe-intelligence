import { useMemo, type MouseEvent } from 'react'
import { renderInlineMarkdown, renderMarkdown } from '../lib/markdown.ts'

interface Props {
  text: string
  /** Path of the source document relative to the repository root, for resolving links. */
  fromPath: string
  inline?: boolean
}

/** External links open in a new tab; in-page anchors are ignored (hash routing owns the URL). */
function handleLinkClick(event: MouseEvent<HTMLElement>) {
  if (!(event.target instanceof Element)) return
  const href = event.target.closest('a')?.getAttribute('href') ?? ''
  if (/^https?:/i.test(href)) {
    event.preventDefault()
    window.open(href, '_blank', 'noopener,noreferrer')
  } else if (href.startsWith('#') && !href.startsWith('#/')) {
    event.preventDefault()
  }
}

export function Markdown({ text, fromPath, inline = false }: Props) {
  const html = useMemo(
    () =>
      inline
        ? renderInlineMarkdown(text, fromPath, __REPO_ROOT__)
        : renderMarkdown(text, fromPath, __REPO_ROOT__),
    [text, fromPath, inline],
  )
  if (inline) {
    return (
      <span
        onClick={handleLinkClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  return (
    <div
      className="markdown"
      onClick={handleLinkClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
