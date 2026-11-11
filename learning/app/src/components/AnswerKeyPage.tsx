import { answerMarkdown, answerPath, lessons } from '../content.ts'
import { lessonHref } from '../lib/links.ts'
import { Markdown } from './Markdown.tsx'

export function AnswerKeyPage({ slug }: { slug: string }) {
  const markdown = answerMarkdown.get(slug)
  const lesson = lessons.find((l) => l.slug === slug)

  return (
    <article className="lesson">
      <p className="notice">
        Write your own answers before reading these. Each question in the lesson
        can reveal its own section once you've answered it.
      </p>
      {markdown ? (
        <Markdown text={markdown} fromPath={answerPath(slug)} />
      ) : (
        <p>There is no answer key for this lesson yet.</p>
      )}
      {lesson && (
        <nav className="pager">
          <a href={lessonHref(lesson.slug)}>← Back to {lesson.title}</a>
        </nav>
      )}
    </article>
  )
}
