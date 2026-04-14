import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import TrackPage from '@/pages/TrackPage'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}))

vi.mock('@/hooks/useWorkouts', () => ({
  default: () => ({ workouts: [], loading: false }),
}))

vi.mock('@/utils/logger', () => ({
  default: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@/services/workoutService', () => ({
  fetchWorkoutHistory: vi.fn().mockResolvedValue([]),
  saveWorkoutSession: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <TrackPage />
    </MemoryRouter>,
  )
}

describe('TrackPage', () => {
  it('renders the Track title', () => {
    renderPage()
    expect(screen.getByText('Track')).toBeInTheDocument()
  })

  it('shows the hero start button', () => {
    renderPage()
    expect(screen.getByText(/Live-Workout starten/i)).toBeInTheDocument()
  })

  it('shows 4 quick-log workout types', () => {
    renderPage()
    expect(screen.getByText('Krafttraining')).toBeInTheDocument()
    expect(screen.getByText('Cardio')).toBeInTheDocument()
    expect(screen.getByText('Yoga')).toBeInTheDocument()
    expect(screen.getByText('HIIT')).toBeInTheDocument()
  })

  it('shows "Schnell loggen" section heading', () => {
    renderPage()
    expect(screen.getByText(/Schnell loggen/i)).toBeInTheDocument()
  })
})
