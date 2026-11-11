/**
 * Pure parsing of lessons and answer keys. The formats are defined in learning/AUTHORING.md:
 * change both together.
 */

export interface Step {
  /** Stable id used for progress: the heading without its time estimate, slugified. */
  id: string
  /** The heading as written, e.g. "Part A: Why Git exists (20 minutes)". */
  title: string
  /** The heading without its time estimate, for navigation. */
  shortTitle: string
  body: string
  /** False for the lesson overview (the text before the first part), which isn't ticked off. */
  isPart: boolean
}

export interface Lesson {
  slug: string
  number: number | null
  title: string
  steps: Step[]
}

export interface Option {
  letter: string
  text: string
}

export interface Question {
  number: number
  label: string | null
  text: string
  options: Option[]
}

export type Block =
  { kind: 'markdown'; text: string } | { kind: 'question'; question: Question }

export interface AnswerSection {
  title: string
  body: string
}

export interface QuestionAnswer extends AnswerSection {
  /** Correct option letter for multiple-choice questions, from the first `**Answer: x)`. */
  correct: string | null
}

export interface AnswerKey {
  questions: Map<number, QuestionAnswer>
  challenges: AnswerSection[]
}

const FENCE_OPEN = /^\s*(`{3,}|~{3,})/
const QUESTION = /^\*\*Question (\d+)(?: \(([^)]*)\))?\.\*\*\s*(.*)$/
const OPTION = /^\s*[-*] ([a-z])\) (.*)$/
const TIME_SUFFIX =
  /\s*\((?:about\s+)?[\d.,–-]+\s*(?:minutes?|mins?|hours?|h)\)\s*$/i
const MCQ_ANSWER = /\*\*Answer:\s*([a-z])\)/i

/** For each line, whether it belongs to a fenced code block (fence lines included). */
export function fencedLines(lines: readonly string[]): boolean[] {
  const result: boolean[] = []
  let open: string | null = null
  for (const line of lines) {
    const match = FENCE_OPEN.exec(line)
    if (open === null) {
      if (match?.[1]) {
        open = match[1]
        result.push(true)
      } else {
        result.push(false)
      }
      continue
    }
    result.push(true)
    const marker = match?.[1]
    const closes =
      marker !== undefined &&
      marker[0] === open[0] &&
      marker.length >= open.length &&
      line.trim() === marker
    if (closes) open = null
  }
  return result
}

function toLines(raw: string): string[] {
  return raw.replace(/\r\n?/g, '\n').split('\n')
}

/** Trims blank lines and horizontal rules (`---`) from both ends of a section. */
export function trimSection(text: string): string {
  const lines = toLines(text)
  const isEdge = (line: string | undefined) =>
    line !== undefined && (line.trim() === '' || /^\s*-{3,}\s*$/.test(line))
  while (isEdge(lines[0])) lines.shift()
  while (isEdge(lines[lines.length - 1])) lines.pop()
  return lines.join('\n')
}

export function stripTime(title: string): string {
  return title.replace(TIME_SUFFIX, '').trim()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseLesson(slug: string, raw: string): Lesson {
  const lines = toLines(raw)
  const fenced = fencedLines(lines)
  let title = slug
  let titleLine = -1
  const headings: { index: number; title: string }[] = []

  lines.forEach((line, index) => {
    if (fenced[index]) return
    const h1 = /^# (.+)$/.exec(line)
    if (h1?.[1] && titleLine === -1) {
      title = h1[1].trim()
      titleLine = index
      return
    }
    const h2 = /^## (.+)$/.exec(line)
    if (h2?.[1]) headings.push({ index, title: h2[1].trim() })
  })

  const steps: Step[] = []
  const introEnd = headings[0]?.index ?? lines.length
  const intro = trimSection(lines.slice(titleLine + 1, introEnd).join('\n'))
  if (intro !== '') {
    steps.push({
      id: 'overview',
      title: 'Overview',
      shortTitle: 'Overview',
      body: intro,
      isPart: false,
    })
  }
  headings.forEach((heading, i) => {
    const end = headings[i + 1]?.index ?? lines.length
    const shortTitle = stripTime(heading.title)
    steps.push({
      id: slugify(shortTitle),
      title: heading.title,
      shortTitle,
      body: trimSection(lines.slice(heading.index + 1, end).join('\n')),
      isPart: true,
    })
  })

  const number = /^(\d+)-/.exec(slug)?.[1]
  return { slug, number: number ? Number(number) : null, title, steps }
}

/** Splits a step's markdown into plain markdown and question blocks. */
export function splitBlocks(body: string): Block[] {
  const lines = toLines(body)
  const fenced = fencedLines(lines)
  const blocks: Block[] = []
  let buffer: string[] = []
  const flush = () => {
    const text = trimSection(buffer.join('\n'))
    if (text !== '') blocks.push({ kind: 'markdown', text })
    buffer = []
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    const startsParagraph = i === 0 || (lines[i - 1] ?? '').trim() === ''
    const match = !fenced[i] && startsParagraph ? QUESTION.exec(line) : null
    if (!match) {
      buffer.push(line)
      i += 1
      continue
    }

    flush()
    const textLines = [match[3] ?? '']
    let j = i + 1
    while (j < lines.length && (lines[j] ?? '').trim() !== '') {
      textLines.push(lines[j] ?? '')
      j += 1
    }

    const options: Option[] = []
    let k = j
    while (k < lines.length && (lines[k] ?? '').trim() === '') k += 1
    if (OPTION.test(lines[k] ?? '')) {
      while (k < lines.length) {
        const current = lines[k] ?? ''
        const option = OPTION.exec(current)
        const last = options[options.length - 1]
        if (option?.[1] !== undefined) {
          options.push({ letter: option[1], text: (option[2] ?? '').trim() })
        } else if (last && current.trim() !== '' && /^\s/.test(current)) {
          last.text = `${last.text} ${current.trim()}`
        } else {
          break
        }
        k += 1
      }
      j = k
    }

    blocks.push({
      kind: 'question',
      question: {
        number: Number(match[1]),
        label: match[2]?.trim() || null,
        text: textLines.join('\n').trim(),
        options,
      },
    })
    i = j
  }
  flush()
  return blocks
}

export function parseAnswerKey(raw: string): AnswerKey {
  const lines = toLines(raw)
  const fenced = fencedLines(lines)
  const sections: { title: string; lines: string[] }[] = []
  let current: { title: string; lines: string[] } | null = null

  lines.forEach((line, index) => {
    const heading = fenced[index] ? null : /^(#{1,3}) (.+)$/.exec(line)
    if (heading?.[1] && heading[2]) {
      current =
        heading[1].length === 3 ? { title: heading[2].trim(), lines: [] } : null
      if (current) sections.push(current)
      return
    }
    current?.lines.push(line)
  })

  const key: AnswerKey = { questions: new Map(), challenges: [] }
  for (const section of sections) {
    const body = trimSection(section.lines.join('\n'))
    const question = /^Question (\d+)\b/.exec(section.title)
    if (question?.[1]) {
      const correct = MCQ_ANSWER.exec(body)?.[1]?.toLowerCase() ?? null
      key.questions.set(Number(question[1]), {
        title: section.title,
        body,
        correct,
      })
    } else if (/^Challenge\b/i.test(section.title)) {
      key.challenges.push({ title: section.title, body })
    }
  }
  return key
}

export function isChallengeStep(step: Step): boolean {
  return /^Challenge\b/i.test(step.title)
}

/** Finds the worked solution for a challenge step: by title, or the only one there is. */
export function findChallengeAnswer(
  stepTitle: string,
  key: AnswerKey | undefined,
): AnswerSection | null {
  if (!key) return null
  const normalise = (title: string) =>
    stripTime(title)
      .replace(/^Challenge\b:?\s*/i, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  const wanted = normalise(stepTitle)
  const exact = key.challenges.find(
    (challenge) => normalise(challenge.title) === wanted,
  )
  if (exact) return exact
  return key.challenges.length === 1 ? (key.challenges[0] ?? null) : null
}

/** "Lesson 1: Git and collaborative development" -> "Git and collaborative development". */
export function titleWithoutNumber(title: string): string {
  return title.replace(/^Lesson \d+:\s*/i, '')
}
