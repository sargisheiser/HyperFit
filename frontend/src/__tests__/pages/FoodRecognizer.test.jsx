import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import FoodRecognizer from '@/pages/FoodRecognizer'
import api from '@/services/api'

vi.mock('@/services/api', () => {
  const mock = {
    get: vi.fn(),
    post: vi.fn(),
  }
  return { default: mock }
})

vi.mock('@/components/NeonCard', () => ({
  default: ({ children }) => <div data-testid="neon-card">{children}</div>,
}))

vi.mock('@/components/LoadingSpinner', () => ({
  default: ({ label }) => <div>{label}</div>,
}))

describe('FoodRecognizer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: [] })
  })

  it('walks through upload journey and surfaces next actions', async () => {
    const now = new Date().toISOString()
    const analysisPayload = {
      food_items: [
        { name: 'Grilled Salmon', quantity: '1 serving' },
        { name: 'Quinoa', quantity: '150 g' },
      ],
      total_calories: 720,
      macronutrients: {
        protein_grams: 42.3,
        carbs_grams: 48.1,
        fat_grams: 22.5,
      },
      confidence_score: 0.93,
      insights: ['High Omega-3 meal', 'Balanced carb load'],
      recommendations: ['Hydrate with 500ml water afterwards'],
      log: {
        id: 'log-1',
        created_at: now,
        total_calories: 720,
        confidence_score: 0.93,
        food_items: [{ name: 'Grilled Salmon' }],
        macronutrients: {
          protein_grams: 42.3,
          carbs_grams: 48.1,
          fat_grams: 22.5,
        },
      },
    }

    api.post.mockResolvedValue({ data: analysisPayload })

    const { container } = render(<FoodRecognizer />)

    expect(screen.getByText('Journey tracker')).toBeInTheDocument()

    const fileInput = container.querySelector('input[type="file"]')
    const file = new File(['dummy'], 'meal.jpg', { type: 'image/jpeg' })

    await waitFor(() => expect(fileInput).toBeInTheDocument())

    fireEvent.change(fileInput, {
      target: { files: [file] },
    })

    await waitFor(() => expect(api.post).toHaveBeenCalled())

    await waitFor(() => expect(screen.getByText('Ready to act')).toBeInTheDocument())

    expect(screen.getByText('Set portion reminder')).toBeInTheDocument()
    expect(screen.getByText('Mark as protein boost')).toBeInTheDocument()
    expect(screen.getAllByText('Grilled Salmon')[0]).toBeInTheDocument()
    expect(screen.getByText('AI nutrition breakdown')).toBeInTheDocument()
  })
})


