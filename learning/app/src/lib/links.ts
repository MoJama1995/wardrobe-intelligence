/** Where a link in course markdown should go. Pure, so it can be unit-tested. */

export type Route =
  | { name: 'home' }
  | { name: 'lesson'; slug: string; step: number }
  | { name: 'answers'; slug: string }

/** Parses `#/`, `#/lesson/<slug>`, `#/lesson/<slug>/<step>` (1-based) and `#/answers/<slug>`. */
export function parseRoute(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)
  const [kind, slug, step] = parts
  if (kind === 'lesson' && slug) {
    const n = Number(step)
    return {
      name: 'lesson',
      slug,
      step: Number.isInteger(n) && n >= 1 ? n - 1 : 0,
    }
  }
  if (kind === 'answers' && slug) return { name: 'answers', slug }
  return { name: 'home' }
}

export function lessonHref(slug: string, stepIndex = 0): string {
  return stepIndex > 0
    ? `#/lesson/${slug}/${stepIndex + 1}`
    : `#/lesson/${slug}`
}

/** Joins a relative path onto a directory, resolving `.` and `..`, POSIX style. */
export function joinPath(dir: string, relative: string): string {
  const out: string[] = []
  for (const segment of `${dir}/${relative}`.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') out.pop()
    else out.push(segment)
  }
  return out.join('/')
}

/**
 * Rewrites an href found in a course document.
 *
 * @param fromPath the document's path relative to the repository root, e.g. `learning/lessons/01-git.md`
 * @param repoRoot absolute path of the repository, used for `vscode://file/...` links
 */
export function resolveHref(
  href: string,
  fromPath: string,
  repoRoot: string,
): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#') || href === '')
    return href

  const [pathPart = ''] = href.split('#')
  const dir = fromPath.split('/').slice(0, -1).join('/')
  const target = joinPath(dir, pathPart)

  if (target === 'learning' || target === 'learning/README.md') return '#/'
  if (target === 'learning/lessons' || target === 'learning/answers')
    return '#/'
  const lesson = /^learning\/lessons\/([^/]+)\.md$/.exec(target)
  if (lesson?.[1]) return lessonHref(lesson[1])
  const answers = /^learning\/answers\/([^/]+)\.md$/.exec(target)
  if (answers?.[1]) return `#/answers/${answers[1]}`

  return `vscode://file${encodeURI(`${repoRoot}/${target}`)}`
}
