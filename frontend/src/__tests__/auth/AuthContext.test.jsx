import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'

vi.mock('@/services/api', () => {
  const mock = {
    post: vi.fn(),
    get: vi.fn(),
    defaults: {
      headers: {
        common: {},
      },
    },
  }

  return { default: mock }
})

function AuthConsumer() {
  const { login } = useAuth()
  const [status, setStatus] = useState('idle')

  const handleLogin = async (mode) => {
    const result = await login('user@example.com', 'password123')
    setStatus(result.success ? 'success' : mode === 'fail' ? 'error' : 'success')
  }

  return (
    <div>
      <button data-testid="login-success" onClick={() => handleLogin('success')}>
        login success
      </button>
      <button data-testid="login-fail" onClick={() => handleLogin('fail')}>
        login fail
      </button>
      <span data-testid="status">{status}</span>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>,
  )
}

describe('AuthProvider login flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('stores token and fetches profile on successful login', async () => {
    const token = 'test-token'
    const user = { id: 7, email: 'user@example.com' }

    api.post.mockResolvedValueOnce({ data: { access_token: token } })
    api.get.mockResolvedValueOnce({ data: user })

    renderWithProvider()

    fireEvent.click(screen.getByTestId('login-success'))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('success'))

    expect(api.post).toHaveBeenCalledWith('/api/users/login', {
      email: 'user@example.com',
      password: 'password123',
    })
    expect(api.get).toHaveBeenCalledWith('/api/users/me')
    expect(localStorage.getItem('token')).toBe(token)
    expect(api.defaults.headers.common.Authorization).toBe(`Bearer ${token}`)
  })

  it('returns error status when login fails', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { detail: 'Invalid credentials' } },
    })

    renderWithProvider()

    fireEvent.click(screen.getByTestId('login-fail'))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'))

    expect(api.get).not.toHaveBeenCalled()
    expect(localStorage.getItem('token')).toBeNull()
  })
})









