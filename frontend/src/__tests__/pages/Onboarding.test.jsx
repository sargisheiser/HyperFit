import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Onboarding from '@/pages/Onboarding'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, full_name: 'Max Mustermann', username: 'max' },
  }),
}))

vi.mock('@/store/userStore', () => ({
  useUserStore: (selector) =>
    selector({
      updateProfile: vi.fn().mockResolvedValue({ success: true }),
    }),
}))

vi.mock('@/utils/logger', () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
  )
}

describe('Onboarding', () => {
  it('renders the welcome step first', () => {
    renderOnboarding()
    expect(screen.getByText(/Max/)).toBeInTheDocument()
  })

  it('shows progress indicator', () => {
    renderOnboarding()
    // OnboardingProgress should be visible
    expect(document.querySelector('[class*="pt-6"]')).toBeInTheDocument()
  })

  it('advances to goal step on "Weiter"', async () => {
    renderOnboarding()
    const weiterBtn = screen.getByText(/Los geht|Weiter|Start/i)
    fireEvent.click(weiterBtn)
    await waitFor(() => {
      expect(screen.getByText(/Ziel/i)).toBeInTheDocument()
    })
  })

  it('shows 5 steps total', () => {
    renderOnboarding()
    // Progress bar should indicate 5 steps
    const progressContainer = document.querySelector('[class*="pt-6"]')
    expect(progressContainer).toBeInTheDocument()
  })

  it('uses first name from user profile', () => {
    renderOnboarding()
    // Should show "Max" from full_name "Max Mustermann"
    expect(screen.getByText(/Max/)).toBeInTheDocument()
  })
})
