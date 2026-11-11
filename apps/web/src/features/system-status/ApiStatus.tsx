import { useApiHealth } from './useApiHealth.ts'

export function ApiStatus() {
  const health = useApiHealth()

  switch (health.status) {
    case 'loading':
      return <p role="status">Checking API…</p>
    case 'error':
      return <p role="alert">API unavailable: {health.message}</p>
    case 'success':
      return (
        <p role="status">
          API {health.data.status} · {health.data.environment} · build{' '}
          {health.data.build}
        </p>
      )
  }
}
