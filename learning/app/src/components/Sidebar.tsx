import { lessons } from '../content.ts'
import { lessonHref, type Route } from '../lib/links.ts'
import { titleWithoutNumber } from '../lib/parse.ts'
import { partCount, partsDone, type Progress } from '../lib/progress.ts'

interface Props {
  route: Route
  progress: Progress
  storageWorks: boolean
}

export function Sidebar({ route, progress, storageWorks }: Props) {
  const activeSlug = route.name === 'home' ? null : route.slug

  return (
    <nav className="sidebar" aria-label="Course">
      <a
        href="#/"
        className={`home-link ${route.name === 'home' ? 'current' : ''}`}
      >
        Engineering course
      </a>
      <ol className="lesson-list">
        {lessons.map((lesson) => {
          const done = partsDone(lesson, progress)
          const total = partCount(lesson)
          const active = lesson.slug === activeSlug
          const finished = total > 0 && done === total
          return (
            <li key={lesson.slug}>
              <a
                href={lessonHref(lesson.slug)}
                className={`lesson-link ${active ? 'active' : ''}`}
                aria-current={
                  active && route.name === 'lesson' && route.step === 0
                    ? 'page'
                    : undefined
                }
              >
                <span className="lesson-number">{lesson.number ?? '•'}</span>
                <span className="lesson-name">
                  {titleWithoutNumber(lesson.title)}
                </span>
                <span
                  className={`badge ${finished ? 'finished' : ''}`}
                  title={`${done} of ${total} parts done`}
                >
                  {finished ? '✓' : `${done}/${total}`}
                </span>
              </a>
              {active && route.name === 'lesson' && (
                <ol className="step-list">
                  {lesson.steps.map((step, i) => {
                    const stepDone = (progress[lesson.slug] ?? []).includes(
                      step.id,
                    )
                    const current = route.step === i
                    return (
                      <li key={step.id}>
                        <a
                          href={lessonHref(lesson.slug, i)}
                          className={current ? 'current' : ''}
                          aria-current={current ? 'step' : undefined}
                        >
                          <span className="tick" aria-hidden="true">
                            {stepDone ? '✓' : ''}
                          </span>
                          {step.shortTitle}
                        </a>
                      </li>
                    )
                  })}
                </ol>
              )}
            </li>
          )
        })}
      </ol>
      {lessons.length === 0 && (
        <p className="muted">No lessons found in learning/lessons/.</p>
      )}
      {!storageWorks && (
        <p className="notice">
          This browser blocks local storage, so progress won't be saved.
        </p>
      )}
    </nav>
  )
}
