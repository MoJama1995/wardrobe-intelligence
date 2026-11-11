import type { Lesson } from './parse.ts'

/** Lesson slug → ids of the parts marked done. */
export type Progress = Record<string, string[]>

/** Lesson slug + question number (e.g. `01-git#q4`) → the learner's answer or chosen letter. */
export type Answers = Record<string, string>

export function answerKeyFor(
  lessonSlug: string,
  questionNumber: number,
): string {
  return `${lessonSlug}#q${questionNumber}`
}

export function partCount(lesson: Lesson): number {
  return lesson.steps.filter((step) => step.isPart).length
}

export function partsDone(lesson: Lesson, progress: Progress): number {
  const done = new Set(progress[lesson.slug] ?? [])
  return lesson.steps.filter((step) => step.isPart && done.has(step.id)).length
}

export function toggleDone(
  progress: Progress,
  lessonSlug: string,
  stepId: string,
): Progress {
  const done = new Set(progress[lessonSlug] ?? [])
  if (done.has(stepId)) done.delete(stepId)
  else done.add(stepId)
  return { ...progress, [lessonSlug]: [...done] }
}

/** Markdown checklist the learner can paste into learning/PROGRESS.md. */
export function progressChecklist(
  lessons: readonly Lesson[],
  progress: Progress,
  date: string,
): string {
  const sections = lessons.map((lesson) => {
    const done = new Set(progress[lesson.slug] ?? [])
    const items = lesson.steps
      .filter((step) => step.isPart)
      .map((step) => `- [${done.has(step.id) ? 'x' : ' '}] ${step.shortTitle}`)
    const heading = `### ${lesson.title} (${partsDone(lesson, progress)}/${partCount(lesson)} parts)`
    return [heading, '', ...items].join('\n')
  })
  return [
    `Progress exported from the course viewer on ${date}.`,
    '',
    ...sections.flatMap((s) => [s, '']),
  ]
    .join('\n')
    .trimEnd()
    .concat('\n')
}

export function isProgress(value: unknown): value is Progress {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (ids) => Array.isArray(ids) && ids.every((id) => typeof id === 'string'),
    )
  )
}

export function isAnswers(value: unknown): value is Answers {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((answer) => typeof answer === 'string')
  )
}
