import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Dashboard from '@/pages/Dashboard'
import api from '@/services/api'

vi.mock('@/services/api', () => {
  const mock = {
    get: vi.fn(),
  }
  return { default: mock }
})

vi.mock('@/components/PerformanceChart', () => ({
  default: ({ data, title }) => (
    <div data-testid="performance-chart">
      {title} ({data.length})
    </div>
  ),
}))

vi.mock('@/components/StatsPanel', () => ({
  default: ({ items }) => (
    <ul data-testid="stats-panel">
      {items.map((item) => (
        <li key={item.label}>
          {item.label}:{item.value}
        </li>
      ))}
    </ul>
  ),
}))

vi.mock('@/components/LoadingSpinner', () => ({
  default: ({ label }) => <div>{label}</div>,
}))

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders computed stats after data load', async () => {
    const workouts = [
      {
        id: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        calories_burned: 450,
      },
      {
        id: 2,
        created_at: '2024-01-02T00:00:00.000Z',
        calories_burned: 300,
      },
    ]
    const foodLogs = [
      {
        id: 'meal-1',
        created_at: '2024-01-02T12:00:00.000Z',
        total_calories: 520,
        confidence_score: 0.92,
        food_items: [{ name: 'Salmon Bowl' }],
      },
    ]

    api.get.mockImplementation((url) => {
      if (url === '/api/workouts/history') {
        return Promise.resolve({ data: workouts })
      }
      if (url === '/api/food/history') {
        return Promise.resolve({ data: foodLogs })
      }
      return Promise.resolve({ data: [] })
    })

    renderWithRouter(<Dashboard />)

    await waitFor(() => expect(screen.getByTestId('stats-panel')).toBeInTheDocument())

    expect(screen.getByText('Total Sessions:2')).toBeInTheDocument()
    expect(screen.getByText('Calories Burned:750 kcal')).toBeInTheDocument()
    expect(screen.getByText('Latest Meal:520 kcal')).toBeInTheDocument()
    expect(screen.getByText('AI Confidence:92%')).toBeInTheDocument()

    expect(screen.getByTestId('performance-chart')).toHaveTextContent('Workout Output (2)')
  })
})


