import { useEffect, useState } from 'react'
import { getHealth, type HealthResponse } from '../../lib/api/client.ts'

export type HealthState =
  | { status: 'loading' }
  | { status: 'success'; data: HealthResponse }
  | { status: 'error'; message: string }

/** Fetches API health once on mount; aborts the request on unmount. */
export function useApiHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    getHealth(controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      })
    return () => controller.abort()
  }, [])

  return state
}
