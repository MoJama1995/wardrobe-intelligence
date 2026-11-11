import { useState } from 'react'
import { answerPath } from '../content.ts'
import type { AnswerSection } from '../lib/parse.ts'
import { Markdown } from './Markdown.tsx'

interface Props {
  lessonSlug: string
  solution: AnswerSection | null
}

/** The worked solution, shown only after the learner says they've tried the challenge. */
export function ChallengeSolution({ lessonSlug, solution }: Props) {
  const [tried, setTried] = useState(false)
  const [shown, setShown] = useState(false)

  if (!solution) {
    return (
      <p className="muted">
        There is no worked solution for this challenge yet.
      </p>
    )
  }
  return (
    <section className="question challenge" aria-label="Worked solution">
      <h3>Worked solution</h3>
      {shown ? (
        <div className="answer-key">
          <Markdown text={solution.body} fromPath={answerPath(lessonSlug)} />
        </div>
      ) : (
        <>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={tried}
              onChange={(event) => setTried(event.target.checked)}
            />
            I've had a go at the challenge myself
          </label>
          <button
            type="button"
            disabled={!tried}
            onClick={() => setShown(true)}
          >
            Show the worked solution
          </button>
        </>
      )}
    </section>
  )
}
