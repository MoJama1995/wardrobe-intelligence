/**
 * Typed HTTP client for services/api.
 *
 * Types come from `schema.gen.ts`, generated from services/api/openapi.json
 * (`npm run gen:api`). Never hand-write a type that the API already defines:
 * regenerate instead, so the frontend and backend cannot silently drift.
 */
import type { components } from './schema.gen.ts'

export type HealthResponse = components['schemas']['HealthResponse']
export type ErrorResponse = components['schemas']['ErrorResponse']

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** An error returned by the API in its standard error envelope. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string | null

  constructor(
    status: number,
    code: string,
    message: string,
    requestId: string | null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const headerRequestId = response.headers.get('X-Request-ID')
  try {
    const body = (await response.json()) as Partial<ErrorResponse>
    if (body.error) {
      return new ApiError(
        response.status,
        body.error.code,
        body.error.message,
        body.error.request_id ?? headerRequestId,
      )
    }
  } catch {
    // Non-JSON error body (e.g. a proxy error page). Fall through.
  }
  return new ApiError(
    response.status,
    'http_error',
    `Request failed with status ${response.status}`,
    headerRequestId,
  )
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init.headers },
  })
  if (!response.ok) {
    throw await toApiError(response)
  }
  return (await response.json()) as T
}

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>('/health', signal ? { signal } : {})
}
