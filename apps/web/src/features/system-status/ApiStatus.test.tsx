import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiStatus } from './ApiStatus.tsx'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('ApiStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a loading state, then the API health', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          status: 'ok',
          service: 'api',
          environment: 'test',
          build: 'abc123',
        }),
      ),
    )

    render(<ApiStatus />)

    expect(screen.getByRole('status')).toHaveTextContent('Checking API')
    expect(
      await screen.findByText(/API ok · test · build abc123/),
    ).toBeInTheDocument()
  })

  it('shows the API error message from the standard error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: 'internal_error',
              message: 'An unexpected error occurred.',
              request_id: 'req-1',
            },
          },
          500,
        ),
      ),
    )

    render(<ApiStatus />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'API unavailable: An unexpected error occurred.',
    )
  })

  it('shows a generic message when the network request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    render(<ApiStatus />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'API unavailable: Failed to fetch',
    )
  })
})
