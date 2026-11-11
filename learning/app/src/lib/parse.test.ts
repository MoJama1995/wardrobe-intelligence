import { describe, expect, it } from 'vitest'
import lesson1Raw from '../../../lessons/01-git.md?raw'
import answers1Raw from '../../../answers/01-git.md?raw'
import {
  findChallengeAnswer,
  parseAnswerKey,
  parseLesson,
  splitBlocks,
  trimSection,
  type Question,
} from './parse.ts'

function questionsOf(body: string): Question[] {
  return splitBlocks(body).flatMap((block) =>
    block.kind === 'question' ? [block.question] : [],
  )
}

describe('Lesson 1 fixture', () => {
  const lesson = parseLesson('01-git', lesson1Raw)
  const allQuestions = lesson.steps.flatMap((step) => questionsOf(step.body))

  it('reads the title, number and steps', () => {
    expect(lesson.title).toBe('Lesson 1: Git and collaborative development')
    expect(lesson.number).toBe(1)
    expect(lesson.steps[0]?.id).toBe('overview')
    expect(lesson.steps[0]?.isPart).toBe(false)
    expect(lesson.steps.map((step) => step.id)).toEqual([
      'overview',
      'before-you-start',
      'part-a-why-git-exists',
      'part-b-the-three-places-your-work-lives',
      'part-c-branches',
      'part-d-github-remotes-and-pull-requests',
      'part-e-merge-conflicts-and-not-overwriting-each-other',
      'challenge-travel-back-in-time',
      'wrap-up',
    ])
  })

  it('keeps the time estimate in the title but not in the short title', () => {
    const partA = lesson.steps.find(
      (step) => step.id === 'part-a-why-git-exists',
    )
    expect(partA?.title).toBe('Part A: Why Git exists (20 minutes)')
    expect(partA?.shortTitle).toBe('Part A: Why Git exists')
  })

  it('finds every question exactly once, in order', () => {
    expect(allQuestions.map((q) => q.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ])
    const leftovers = lesson.steps
      .flatMap((step) => splitBlocks(step.body))
      .filter(
        (block) =>
          block.kind === 'markdown' && /^\*\*Question \d/m.test(block.text),
      )
    expect(leftovers).toEqual([])
  })

  it('reads multiple-choice options and labels', () => {
    const byNumber = new Map(allQuestions.map((q) => [q.number, q]))
    expect(byNumber.get(4)?.options.map((o) => o.letter)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
    expect(byNumber.get(4)?.options[0]?.text).toBe('only you')
    expect(byNumber.get(6)?.options).toHaveLength(4)
    expect(byNumber.get(1)?.options).toEqual([])
    expect(byNumber.get(9)?.label).toBe('explain it back')
    expect(byNumber.get(2)?.text).toContain(
      'Where should the weights live instead?',
    )
  })

  it('ignores headings inside code blocks', () => {
    const exerciseE1 = lesson.steps.find((step) => step.id.startsWith('part-e'))
    expect(exerciseE1?.body).toContain('# edit line 2 and save, then:')
  })
})

describe('Lesson 1 answer key fixture', () => {
  const key = parseAnswerKey(answers1Raw)

  it('has a section per question and the multiple-choice answers', () => {
    expect([...key.questions.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(key.questions.get(4)?.correct).toBe('a')
    expect(key.questions.get(6)?.correct).toBe('b')
    expect(key.questions.get(1)?.correct).toBeNull()
  })

  it('ends each section before the next heading', () => {
    expect(key.questions.get(1)?.body).toContain('staging area')
    expect(key.questions.get(1)?.body).not.toContain('Question 2')
    expect(key.questions.get(1)?.body.endsWith('---')).toBe(false)
  })

  it('matches the challenge solution to the lesson step', () => {
    expect(key.challenges).toHaveLength(1)
    const solution = findChallengeAnswer(
      'Challenge: travel back in time (15 minutes)',
      key,
    )
    expect(solution?.body).toContain('git restore --source')
  })
})

describe('splitBlocks', () => {
  it('parses a labelled multiple-choice question with a wrapped option', () => {
    const body = [
      'Intro text.',
      '',
      '**Question 1 (scenario).** What happens',
      'next?',
      '',
      '- a) first',
      '- b) second option that',
      '  wraps onto a new line',
      '',
      'After.',
    ].join('\n')

    expect(splitBlocks(body)).toEqual([
      { kind: 'markdown', text: 'Intro text.' },
      {
        kind: 'question',
        question: {
          number: 1,
          label: 'scenario',
          text: 'What happens\nnext?',
          options: [
            { letter: 'a', text: 'first' },
            { letter: 'b', text: 'second option that wraps onto a new line' },
          ],
        },
      },
      { kind: 'markdown', text: 'After.' },
    ])
  })

  it('leaves an ordinary list after an open question as markdown', () => {
    const blocks = splitBlocks(
      '**Question 2.** Explain.\n\n- a point\n- another',
    )
    expect(blocks).toEqual([
      {
        kind: 'question',
        question: { number: 2, label: null, text: 'Explain.', options: [] },
      },
      { kind: 'markdown', text: '- a point\n- another' },
    ])
  })

  it('ignores question-like lines in code blocks and mid-paragraph', () => {
    const body = [
      '```',
      '**Question 3.** not real',
      '```',
      '',
      'Some text',
      '**Question 4.** inline',
    ].join('\n')
    expect(splitBlocks(body).every((block) => block.kind === 'markdown')).toBe(
      true,
    )
  })
})

describe('parseAnswerKey and parseLesson edge cases', () => {
  it('handles a missing or empty answer key', () => {
    const key = parseAnswerKey('')
    expect(key.questions.size).toBe(0)
    expect(findChallengeAnswer('Challenge: anything', key)).toBeNull()
    expect(findChallengeAnswer('Challenge: anything', undefined)).toBeNull()
  })

  it('reads an upper-case answer letter and needs a title match when there are several challenges', () => {
    const key = parseAnswerKey(
      [
        '### Question 1: pick',
        '',
        '**Answer: B).** Because.',
        '### Challenge: one',
        'x',
        '### Challenge: two',
        'y',
      ].join('\n'),
    )
    expect(key.questions.get(1)?.correct).toBe('b')
    expect(findChallengeAnswer('Challenge: two (10 minutes)', key)?.body).toBe(
      'y',
    )
    expect(findChallengeAnswer('Challenge: three', key)).toBeNull()
  })

  it('uses the slug when there is no title, and an overview when there are no parts', () => {
    const lesson = parseLesson('notes', 'Just some text.')
    expect(lesson.title).toBe('notes')
    expect(lesson.number).toBeNull()
    expect(lesson.steps).toHaveLength(1)
    expect(lesson.steps[0]?.isPart).toBe(false)
  })

  it('trims blank lines and horizontal rules', () => {
    expect(trimSection('\n---\n\nBody\n\n---\n')).toBe('Body')
  })
})
