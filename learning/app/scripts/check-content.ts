/**
 * Checks every lesson and answer key against the formats in learning/AUTHORING.md, using the same
 * parser as the viewer. Run with `npm run check-content`. Exits 1 if anything would break the viewer.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  fencedLines,
  findChallengeAnswer,
  isChallengeStep,
  parseAnswerKey,
  parseLesson,
  splitBlocks,
  type Question,
} from '../src/lib/parse.ts'

const learningDir = fileURLToPath(new URL('../../', import.meta.url))
const lessonFiles = readdirSync(`${learningDir}lessons`)
  .filter((name) => name.endsWith('.md'))
  .sort()

let errors = 0
let warnings = 0
const error = (file: string, message: string) => {
  errors += 1
  console.error(`ERROR    ${file}: ${message}`)
}
const warn = (file: string, message: string) => {
  warnings += 1
  console.warn(`WARNING  ${file}: ${message}`)
}

for (const name of lessonFiles) {
  const slug = name.replace(/\.md$/, '')
  const file = `lessons/${name}`
  const raw = readFileSync(`${learningDir}${file}`, 'utf8')
  const lesson = parseLesson(slug, raw)

  const titleNumber = /^Lesson (\d+):/.exec(lesson.title)?.[1]
  if (!titleNumber)
    error(file, `title should start "Lesson N:", found "${lesson.title}"`)
  else if (Number(titleNumber) !== lesson.number)
    error(file, `title says Lesson ${titleNumber} but the file is ${slug}`)

  const questions: Question[] = lesson.steps.flatMap((step) =>
    splitBlocks(step.body).flatMap((block) =>
      block.kind === 'question' ? [block.question] : [],
    ),
  )
  const numbers = questions.map((q) => q.number)
  numbers.forEach((n, i) => {
    if (n !== i + 1)
      error(
        file,
        `questions should be numbered 1, 2, 3...; question ${i + 1} is numbered ${n}`,
      )
  })

  // Lines that look like questions but weren't parsed as one (wrong format or mid-paragraph).
  const lines = raw.split('\n')
  const fenced = fencedLines(lines)
  const parsedCount = numbers.length
  const lookalikes = lines.filter(
    (line, i) => !fenced[i] && /^\s*\*\*Question\b/.test(line),
  ).length
  if (lookalikes !== parsedCount) {
    error(
      file,
      `${lookalikes} lines start with "**Question" but only ${parsedCount} parse as questions. ` +
        'Use "**Question N.**" or "**Question N (label).**" at the start of a paragraph.',
    )
  }

  console.log(
    `checked  ${file}: ${lesson.steps.length} steps, ${questions.length} questions`,
  )

  const answerFile = `answers/${name}`
  if (!existsSync(`${learningDir}${answerFile}`)) {
    warn(file, `no answer key (${answerFile})`)
    continue
  }
  const key = parseAnswerKey(
    readFileSync(`${learningDir}${answerFile}`, 'utf8'),
  )

  for (const question of questions) {
    const answer = key.questions.get(question.number)
    if (!answer) {
      error(answerFile, `no "### Question ${question.number}:" section`)
      continue
    }
    if (question.options.length > 0) {
      const letters = question.options.map((o) => o.letter)
      if (!answer.correct)
        error(
          answerFile,
          `question ${question.number} is multiple choice but has no "**Answer: x)"`,
        )
      else if (!letters.includes(answer.correct)) {
        error(
          answerFile,
          `question ${question.number}: answer "${answer.correct}" isn't one of ${letters.join(', ')}`,
        )
      }
    }
  }
  for (const n of key.questions.keys()) {
    if (!numbers.includes(n))
      warn(
        answerFile,
        `section for question ${n}, which the lesson doesn't have`,
      )
  }
  for (const step of lesson.steps.filter(isChallengeStep)) {
    if (!findChallengeAnswer(step.title, key))
      error(answerFile, `no "### Challenge" section for "${step.title}"`)
  }
}

console.log(
  `\n${lessonFiles.length} lessons, ${errors} errors, ${warnings} warnings`,
)
process.exitCode = errors > 0 ? 1 : 0
