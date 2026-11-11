import { useEffect } from 'react'
import { AnswerKeyPage } from './components/AnswerKeyPage.tsx'
import { Home } from './components/Home.tsx'
import { LessonView } from './components/LessonView.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import { lessons } from './content.ts'
import {
  useHashRoute,
  usePersistentState,
  useStorageAvailable,
} from './hooks.ts'
import {
  isAnswers,
  isProgress,
  toggleDone,
  type Answers,
  type Progress,
} from './lib/progress.ts'

const PROGRESS_KEY = 'wardrobe-course:v1:progress'
const ANSWERS_KEY = 'wardrobe-course:v1:answers'

export function App() {
  const route = useHashRoute()
  const storageWorks = useStorageAvailable()
  const [progress, setProgress] = usePersistentState<Progress>(
    PROGRESS_KEY,
    {},
    isProgress,
  )
  const [answers, setAnswers] = usePersistentState<Answers>(
    ANSWERS_KEY,
    {},
    isAnswers,
  )

  const lesson =
    route.name === 'lesson'
      ? lessons.find((l) => l.slug === route.slug)
      : undefined

  useEffect(() => {
    const step = route.name === 'lesson' ? lesson?.steps[route.step] : undefined
    document.title = lesson
      ? `${step?.shortTitle ?? lesson.title} · Course`
      : 'Engineering course'
  }, [route, lesson])

  let main
  if (route.name === 'home') {
    main = <Home progress={progress} />
  } else if (route.name === 'answers') {
    main = <AnswerKeyPage slug={route.slug} />
  } else if (lesson) {
    main = (
      <LessonView
        lesson={lesson}
        stepIndex={route.step}
        progress={progress}
        answers={answers}
        onToggleDone={(stepId) =>
          setProgress((previous) => toggleDone(previous, lesson.slug, stepId))
        }
        onAnswer={(key, value) =>
          setAnswers((previous) => ({ ...previous, [key]: value }))
        }
      />
    )
  } else {
    main = (
      <p>
        That lesson isn't written yet. <a href="#/">Back to the course home</a>
      </p>
    )
  }

  return (
    <div className="layout">
      <Sidebar route={route} progress={progress} storageWorks={storageWorks} />
      <main className="content">{main}</main>
    </div>
  )
}
