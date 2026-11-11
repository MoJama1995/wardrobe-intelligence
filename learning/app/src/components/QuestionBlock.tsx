import { useId, useState } from 'react'
import { answerPath, lessonPath } from '../content.ts'
import type { Question, QuestionAnswer } from '../lib/parse.ts'
import { Markdown } from './Markdown.tsx'

interface Props {
  lessonSlug: string
  question: Question
  answer: QuestionAnswer | undefined
  value: string
  onChange: (value: string) => void
}

const TutorHint = () => (
  <p className="hint">
    For a discussion, ask <code>/tutor</code> in Claude Code.
  </p>
)

function AnswerKeySection({
  lessonSlug,
  answer,
}: {
  lessonSlug: string
  answer: QuestionAnswer
}) {
  return (
    <div className="answer-key">
      <p className="answer-key-label">Answer key</p>
      <Markdown text={answer.body} fromPath={answerPath(lessonSlug)} />
    </div>
  )
}

export function QuestionBlock({
  lessonSlug,
  question,
  answer,
  value,
  onChange,
}: Props) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const heading = `Question ${question.number}${question.label ? ` (${question.label})` : ''}`
  const isMultipleChoice = question.options.length > 0

  return (
    <section className="question" aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`}>{heading}</h3>
      <Markdown text={question.text} fromPath={lessonPath(lessonSlug)} />

      {isMultipleChoice ? (
        <>
          <fieldset className="options">
            <legend className="visually-hidden">Choose one answer</legend>
            {question.options.map((option) => {
              const chosen = value === option.letter
              const verdict =
                chosen && answer?.correct
                  ? option.letter === answer.correct
                    ? 'right'
                    : 'wrong'
                  : ''
              return (
                <label key={option.letter} className={`option ${verdict}`}>
                  <input
                    type="radio"
                    name={`${id}-options`}
                    value={option.letter}
                    checked={chosen}
                    onChange={() => onChange(option.letter)}
                  />
                  <span className="option-letter">{option.letter})</span>
                  <Markdown
                    text={option.text}
                    fromPath={lessonPath(lessonSlug)}
                    inline
                  />
                </label>
              )
            })}
          </fieldset>
          {value !== '' && (
            <p className="feedback" role="status">
              {!answer?.correct
                ? 'Saved. There is no answer key for this question yet.'
                : value === answer.correct
                  ? '✓ Correct.'
                  : '✗ Not quite. The answer key below explains why.'}
            </p>
          )}
          {value !== '' && answer && (
            <AnswerKeySection lessonSlug={lessonSlug} answer={answer} />
          )}
        </>
      ) : (
        <>
          <label htmlFor={`${id}-answer`} className="visually-hidden">
            Your answer
          </label>
          <textarea
            id={`${id}-answer`}
            rows={5}
            value={value}
            placeholder="Write your answer here first. It's saved in this browser."
            onChange={(event) => onChange(event.target.value)}
          />
          {answer ? (
            !revealed && (
              <button
                type="button"
                disabled={value.trim() === ''}
                onClick={() => setRevealed(true)}
              >
                Compare with the answer key
              </button>
            )
          ) : (
            <p className="muted">
              There is no answer key for this question yet.
            </p>
          )}
          {revealed && answer && (
            <AnswerKeySection lessonSlug={lessonSlug} answer={answer} />
          )}
        </>
      )}
      <TutorHint />
    </section>
  )
}
