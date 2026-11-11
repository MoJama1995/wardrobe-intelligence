import { useState } from 'react'
import { lessons, readmeMarkdown } from '../content.ts'
import { lessonHref } from '../lib/links.ts'
import {
  partCount,
  partsDone,
  progressChecklist,
  type Progress,
} from '../lib/progress.ts'
import { Markdown } from './Markdown.tsx'

interface Props {
  progress: Progress
}

export function Home({ progress }: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>(
    'idle',
  )
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const checklist = progressChecklist(lessons, progress, today)

  const copy = () => {
    if (!navigator.clipboard) {
      setCopyState('manual')
      return
    }
    navigator.clipboard.writeText(checklist).then(
      () => setCopyState('copied'),
      () => setCopyState('manual'),
    )
  }

  return (
    <>
      <section className="card" aria-labelledby="progress-heading">
        <h2 id="progress-heading">Your progress</h2>
        <table className="progress-table">
          <tbody>
            {lessons.map((lesson) => {
              const done = partsDone(lesson, progress)
              const total = partCount(lesson)
              return (
                <tr key={lesson.slug}>
                  <td>
                    <a href={lessonHref(lesson.slug)}>{lesson.title}</a>
                  </td>
                  <td className="progress-cell">
                    <progress
                      max={Math.max(total, 1)}
                      value={done}
                      aria-label={`${lesson.title} progress`}
                    />
                    <span className="muted">
                      {done}/{total}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="muted">
          Saved in this browser only. <code>learning/PROGRESS.md</code> is the
          shared record: paste this checklist there, then commit it on a branch.
        </p>
        <button type="button" onClick={copy}>
          Copy progress as checklist
        </button>
        {copyState === 'copied' && (
          <span className="feedback" role="status">
            {' '}
            Copied.
          </span>
        )}
        {copyState === 'manual' && (
          <textarea
            className="export"
            readOnly
            rows={10}
            value={checklist}
            aria-label="Progress checklist"
          />
        )}
      </section>
      <Markdown text={readmeMarkdown} fromPath="learning/README.md" />
    </>
  )
}
