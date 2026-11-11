import { useEffect, useState } from 'react'
import { parseRoute, type Route } from './lib/links.ts'
import { readJSON, storageAvailable, writeJSON } from './lib/storage.ts'

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.hash),
  )
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

/** State saved to localStorage under `key`. Falls back to `initial` when storage is unusable. */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T,
): [T, (update: (previous: T) => T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = readJSON(key)
    return isValid(stored) ? stored : initial
  })
  useEffect(() => {
    writeJSON(key, value)
  }, [key, value])
  return [value, setValue]
}

export function useStorageAvailable(): boolean {
  const [available] = useState(storageAvailable)
  return available
}
