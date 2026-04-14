import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import CoachPage from '@/pages/CoachPage'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, full_name: 'Max Mustermann', username: 'max' } }),
}))

vi.mock('@/store/userStore', () => ({
  default: (selector) =>
    selector({
      profile: { full_name: 'Max Mustermann', weight_kg: 80 },
    }),
}))

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { response: 'Test AI response' } }),
  },
}))

vi.mock('@/utils/logger', () => ({
  default: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@/components/Nutrition/CheckInFlow', () => ({
  default: () => <div>CheckInFlow</div>,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <CoachPage />
    </MemoryRouter>,
  )
}

describe('CoachPage', () => {
  it('renders the coach welcome heading', () => {
    renderPage()
    expect(screen.getByText('Dein KI-Coach')).toBeInTheDocument()
  })

  it('shows quick prompt chips', () => {
    renderPage()
    expect(screen.getByText('Workout-Plan')).toBeInTheDocument()
    expect(screen.getByText('Ernährung')).toBeInTheDocument()
    expect(screen.getByText('Ziele')).toBeInTheDocument()
    expect(screen.getByText('Fortschritt')).toBeInTheDocument()
  })

  it('has a message input field', () => {
    renderPage()
    const input = screen.getByPlaceholderText(/Nachricht|Frage|schreib/i)
    expect(input).toBeInTheDocument()
  })

  it('has a send button', () => {
    renderPage()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('can type a message', () => {
    renderPage()
    const input = screen.getByPlaceholderText(/Nachricht|Frage|schreib/i)
    fireEvent.change(input, { target: { value: 'Wie viel Protein?' } })
    expect(input.value).toBe('Wie viel Protein?')
  })
})
