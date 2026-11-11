/**
 * All course content, bundled at build time from learning/. In dev, Vite reloads this module
 * when a lesson or answer key is added or changed.
 */
import readme from '../../README.md?raw'
import {
  parseAnswerKey,
  parseLesson,
  type AnswerKey,
  type Lesson,
} from './lib/parse.ts'

const lessonFiles = import.meta.glob<string>('../../lessons/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const answerFiles = import.meta.glob<string>('../../answers/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function slugOf(path: string): string {
  return (path.split('/').pop() ?? path).replace(/\.md$/, '')
}

export const readmeMarkdown: string = readme

export const lessons: Lesson[] = Object.entries(lessonFiles)
  .map(([path, raw]) => parseLesson(slugOf(path), raw))
  .sort((a, b) => a.slug.localeCompare(b.slug))

export const answerMarkdown = new Map<string, string>(
  Object.entries(answerFiles).map(([path, raw]) => [slugOf(path), raw]),
)

export const answerKeys = new Map<string, AnswerKey>(
  [...answerMarkdown].map(([slug, raw]) => [slug, parseAnswerKey(raw)]),
)

export function lessonPath(slug: string): string {
  return `learning/lessons/${slug}.md`
}

export function answerPath(slug: string): string {
  return `learning/answers/${slug}.md`
}
