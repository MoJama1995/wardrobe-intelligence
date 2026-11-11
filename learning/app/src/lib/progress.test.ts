import { describe, expect, it } from 'vitest'
import { parseLesson } from './parse.ts'
import {
  isAnswers,
  isProgress,
  partsDone,
  progressChecklist,
  toggleDone,
} from './progress.ts'

const lesson = parseLesson(
  '02-demo',
  [
    '# Lesson 2: Demo',
    '',
    'Intro.',
    '',
    '## Part A: First (10 minutes)',
    'a',
    '## Part B: Second',
    'b',
  ].join('\n'),
)

describe('progress', () => {
  it('toggles parts and counts only real parts', () => {
    let progress = toggleDone({}, '02-demo', 'part-a-first')
    expect(partsDone(lesson, progress)).toBe(1)
    progress = toggleDone(progress, '02-demo', 'part-a-first')
    expect(partsDone(lesson, progress)).toBe(0)
  })

  it('exports a checklist for PROGRESS.md', () => {
    const progress = { '02-demo': ['part-b-second'] }
    expect(progressChecklist([lesson], progress, '11 November 2026')).toBe(
      [
        'Progress exported from the course viewer on 11 November 2026.',
        '',
        '### Lesson 2: Demo (1/2 parts)',
        '',
        '- [ ] Part A: First',
        '- [x] Part B: Second',
        '',
      ].join('\n'),
    )
  })

  it('rejects malformed stored data', () => {
    expect(isProgress({ a: ['x'] })).toBe(true)
    expect(isProgress({ a: [1] })).toBe(false)
    expect(isProgress(['x'])).toBe(false)
    expect(isProgress(null)).toBe(false)
    expect(isAnswers({ '01-git#q1': 'text' })).toBe(true)
    expect(isAnswers({ '01-git#q1': 3 })).toBe(false)
  })
})
