import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import WorkoutTracker from '@/pages/WorkoutTracker'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, full_name: 'Test User' },
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useWebSocket', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    status: 'idle',
    send: vi.fn(),
    close: vi.fn(),
  })),
}))

vi.mock('@/services/workoutService', () => ({
  fetchWorkoutHistory: vi.fn().mockResolvedValue([]),
  saveWorkoutSession: vi.fn().mockResolvedValue({}),
}))

describe.skip('WorkoutTracker (skipped - OOM issue)', () => {
  const playMock = vi.fn().mockResolvedValue()
  const getUserMediaMock = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: vi.fn() }],
  })

  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: { getUserMedia: getUserMediaMock },
    })

    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      writable: true,
      value: playMock,
    })

    Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ drawImage: vi.fn(), clearRect: vi.fn() })),
    })

    Object.defineProperty(window.HTMLCanvasElement.prototype, 'toDataURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'data:image/jpeg;base64,mock'),
    })
  })

  it('moves tracker status from idle to initializing when launching', async () => {
    render(
      <MemoryRouter>
        <WorkoutTracker />
      </MemoryRouter>,
    )

    expect(screen.getByText('Ready to launch the HyperFit tracker.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Launch live tracker'))

    await waitFor(() =>
      expect(screen.getByText('Initializing camera and AI pipeline…')).toBeInTheDocument(),
    )

    expect(getUserMediaMock).toHaveBeenCalled()
    expect(playMock).toHaveBeenCalled()
  })
})


