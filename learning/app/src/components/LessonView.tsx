import { useMemo } from 'react'
import { answerKeys, lessonPath, lessons } from '../content.ts'
import { lessonHref } from '../lib/links.ts'
import {
  findChallengeAnswer,
  isChallengeStep,
  splitBlocks,
  type Lesson,
} from '../lib/parse.ts'
import { answerKeyFor, type Answers, type Progress } from '../lib/progress.ts'
import { ChallengeSolution } from './ChallengeSolution.tsx'
import { Markdown } from './Markdown.tsx'
import { QuestionBlock } from './QuestionBlock.tsx'

interface Props {
  lesson: Lesson
  stepIndex: number
  progress: Progress
  answers: Answers
  onToggleDone: (stepId: string) => void
  onAnswer: (key: string, value: string) => void
}

export function LessonView({
  lesson,
  stepIndex,
  progress,
  answers,
  onToggleDone,
  onAnswer,
}: Props) {
  const index = Math.min(stepIndex, lesson.steps.length - 1)
  const step = lesson.steps[index]
  const blocks = useMemo(() => (step ? splitBlocks(step.body) : []), [step])

  if (!step) {
    return <p>This lesson has no content yet.</p>
  }

  const key = answerKeys.get(lesson.slug)
  const done = (progress[lesson.slug] ?? []).includes(step.id)
  const nextLesson =
    lessons[lessons.findIndex((l) => l.slug === lesson.slug) + 1]
  const previous = index > 0 ? lessonHref(lesson.slug, index - 1) : null
  const next =
    index < lesson.steps.length - 1 ? lessonHref(lesson.slug, index + 1) : null

  return (
    <article className="lesson">
      <p className="eyebrow">
        {lesson.title} · step {index + 1} of {lesson.steps.length}
      </p>
      <h1>{step.title}</h1>

      {blocks.map((block, i) =>
        block.kind === 'markdown' ? (
          <Markdown
            key={i}
            text={block.text}
            fromPath={lessonPath(lesson.slug)}
          />
        ) : (
          <QuestionBlock
            key={`${index}-q${block.question.number}`}
            lessonSlug={lesson.slug}
            question={block.question}
            answer={key?.questions.get(block.question.number)}
            value={
              answers[answerKeyFor(lesson.slug, block.question.number)] ?? ''
            }
            onChange={(value) =>
              onAnswer(answerKeyFor(lesson.slug, block.question.number), value)
            }
          />
        ),
      )}

      {isChallengeStep(step) && (
        <ChallengeSolution
          key={`${lesson.slug}-${step.id}`}
          lessonSlug={lesson.slug}
          solution={findChallengeAnswer(step.title, key)}
        />
      )}

      {step.isPart && (
        <label className={`mark-done ${done ? 'is-done' : ''}`}>
          <input
            type="checkbox"
            checked={done}
            onChange={() => onToggleDone(step.id)}
          />
          {done ? 'Part done' : 'Mark this part done'}
        </label>
      )}

      <nav className="pager" aria-label="Lesson steps">
        {previous ? <a href={previous}>← Previous</a> : <span />}
        {next ? (
          <a href={next} className="primary">
            Next: {lesson.steps[index + 1]?.shortTitle} →
          </a>
        ) : nextLesson ? (
          <a href={lessonHref(nextLesson.slug)} className="primary">
            Next lesson: {nextLesson.title} →
          </a>
        ) : (
          <a href="#/" className="primary">
            Back to the course home
          </a>
        )}
      </nav>
    </article>
  )
}
