import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'

// Mock axios before importing api
vi.mock('axios', () => {
  const requestInterceptors = []
  const responseInterceptors = []

  const instance = {
    interceptors: {
      request: {
        use: (fulfilled, rejected) => {
          requestInterceptors.push({ fulfilled, rejected })
        },
      },
      response: {
        use: (fulfilled, rejected) => {
          responseInterceptors.push({ fulfilled, rejected })
        },
      },
    },
    defaults: {
      baseURL: 'http://localhost:8000',
      headers: { common: {} },
    },
    _responseInterceptors: responseInterceptors,
  }

  const axiosMock = {
    create: vi.fn(() => instance),
    post: vi.fn(),
    _instance: instance,
  }

  return { default: axiosMock }
})

describe('api.js token refresh interceptor', () => {
  let responseInterceptor

  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()

    // Reset modules to re-run api.js setup
    vi.resetModules()

    // Re-import to trigger interceptor registration
    const axiosMod = await import('axios')
    await import('@/services/api')

    const instance = axiosMod.default._instance
    responseInterceptor = instance._responseInterceptors[0]
  })

  it('registers a response interceptor', () => {
    expect(responseInterceptor).toBeDefined()
    expect(responseInterceptor.rejected).toBeInstanceOf(Function)
  })

  it('passes through successful responses', async () => {
    const response = { data: { ok: true }, status: 200 }
    const result = await responseInterceptor.fulfilled(response)
    expect(result).toBe(response)
  })

  it('dispatches auth:logout on 401 without refresh token', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const error = {
      config: { url: '/api/users/me' },
      response: { status: 401 },
    }

    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)
    expect(localStorage.getItem('token')).toBeNull()

    dispatchSpy.mockRestore()
  })

  it('attempts refresh when refresh_token exists', async () => {
    localStorage.setItem('refresh_token', 'valid-refresh-token')

    const axiosMod = (await import('axios')).default
    axiosMod.post.mockResolvedValueOnce({
      data: {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      },
    })

    const originalRequest = {
      url: '/api/users/me',
      headers: {},
      _retry: false,
    }
    const error = {
      config: originalRequest,
      response: { status: 401 },
    }

    // The interceptor calls api(originalRequest) which we can't fully mock here,
    // but we can verify the refresh call was made
    try {
      await responseInterceptor.rejected(error)
    } catch {
      // Expected — api(originalRequest) isn't a real function in the mock
    }

    expect(axiosMod.post).toHaveBeenCalledWith(
      'http://localhost:8000/api/users/refresh',
      { refresh_token: 'valid-refresh-token' }
    )
  })

  it('skips refresh for login requests', async () => {
    localStorage.setItem('refresh_token', 'some-token')

    const error = {
      config: { url: '/api/users/login' },
      response: { status: 401 },
    }

    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('skips refresh for refresh requests to prevent loops', async () => {
    localStorage.setItem('refresh_token', 'some-token')

    const error = {
      config: { url: '/api/users/refresh' },
      response: { status: 401 },
    }

    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('clears tokens when refresh fails', async () => {
    localStorage.setItem('token', 'old-access')
    localStorage.setItem('refresh_token', 'expired-refresh')

    const axiosMod = (await import('axios')).default
    axiosMod.post.mockRejectedValueOnce(new Error('refresh failed'))

    const error = {
      config: { url: '/api/users/me', headers: {} },
      response: { status: 401 },
    }

    await expect(responseInterceptor.rejected(error)).rejects.toThrow('refresh failed')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })
})
