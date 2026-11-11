import { describe, expect, it } from 'vitest'
import { parseRoute, resolveHref } from './links.ts'

const ROOT = '/home/learner/wardrobe-intelligence'
const LESSON = 'learning/lessons/01-git.md'
const README = 'learning/README.md'

describe('resolveHref', () => {
  it('keeps lessons and answer keys inside the app', () => {
    expect(resolveHref('../answers/01-git.md', LESSON, ROOT)).toBe(
      '#/answers/01-git',
    )
    expect(resolveHref('02-project-structure.md', LESSON, ROOT)).toBe(
      '#/lesson/02-project-structure',
    )
    expect(resolveHref('lessons/01-git.md', README, ROOT)).toBe(
      '#/lesson/01-git',
    )
    expect(resolveHref('lessons/', README, ROOT)).toBe('#/')
    expect(resolveHref('../README.md', LESSON, ROOT)).toBe('#/')
  })

  it('opens other repository files in VS Code', () => {
    expect(resolveHref('../../.gitignore', LESSON, ROOT)).toBe(
      `vscode://file${ROOT}/.gitignore`,
    )
    expect(resolveHref('../docs/architecture/overview.md', README, ROOT)).toBe(
      `vscode://file${ROOT}/docs/architecture/overview.md`,
    )
    expect(resolveHref('PROGRESS.md', README, ROOT)).toBe(
      `vscode://file${ROOT}/learning/PROGRESS.md`,
    )
    expect(
      resolveHref('../../CONTRIBUTING.md#git-workflow', LESSON, ROOT),
    ).toBe(`vscode://file${ROOT}/CONTRIBUTING.md`)
    expect(resolveHref('../../README.md', LESSON, '/Users/a b/repo')).toBe(
      'vscode://file/Users/a%20b/repo/README.md',
    )
  })

  it('leaves external links and anchors alone', () => {
    expect(resolveHref('https://brew.sh', LESSON, ROOT)).toBe('https://brew.sh')
    expect(resolveHref('mailto:someone@example.com', LESSON, ROOT)).toBe(
      'mailto:someone@example.com',
    )
    expect(resolveHref('#part-a', LESSON, ROOT)).toBe('#part-a')
  })
})

describe('parseRoute', () => {
  it('parses the routes the app uses', () => {
    expect(parseRoute('')).toEqual({ name: 'home' })
    expect(parseRoute('#/')).toEqual({ name: 'home' })
    expect(parseRoute('#/lesson/01-git')).toEqual({
      name: 'lesson',
      slug: '01-git',
      step: 0,
    })
    expect(parseRoute('#/lesson/01-git/3')).toEqual({
      name: 'lesson',
      slug: '01-git',
      step: 2,
    })
    expect(parseRoute('#/lesson/01-git/zero')).toEqual({
      name: 'lesson',
      slug: '01-git',
      step: 0,
    })
    expect(parseRoute('#/answers/01-git')).toEqual({
      name: 'answers',
      slug: '01-git',
    })
    expect(parseRoute('#/nonsense')).toEqual({ name: 'home' })
  })
})
