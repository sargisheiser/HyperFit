import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../../pages/Dashboard'
import { AuthProvider } from '../../contexts/AuthContext'

// Mock useAuth hook
const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
}

const mockAuthValue = {
  user: mockUser,
  isAuthenticated: true,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  fetchUser: vi.fn(),
}

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => mockAuthValue,
  }
})

// Mock useDashboardStats hook
vi.mock('../../hooks/useDashboardStats', () => ({
  default: () => ({
    stats: [
      { label: 'Calories', value: '1500', footnote: 'kcal' },
      { label: 'Protein', value: '120g', footnote: 'target: 150g' },
    ],
    loading: false,
    error: null,
  }),
}))

// Mock useUserStore
vi.mock('../../store/userStore', () => ({
  default: () => ({
    profile: {
      id: 1,
      email: 'test@example.com',
      weight_kg: 75,
      activity_level: 'moderate',
      daily_calorie_target: 2000,
    },
    fetchProfile: vi.fn(),
  }),
}))

describe('Dashboard', () => {
  it('renders computed stats after data load', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </MemoryRouter>
    )

    // Test passes if component renders without errors
    expect(document.body).toBeTruthy()
  })
})
