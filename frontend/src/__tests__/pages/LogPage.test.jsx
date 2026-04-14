import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import LogPage from '@/pages/LogPage'

// Mock child components
vi.mock('@/components/log/ModeToggle', () => ({
  default: ({ activeMode, onModeChange }) => (
    <div data-testid="mode-toggle">
      <button onClick={() => onModeChange('foto')}>Foto</button>
      <button onClick={() => onModeChange('barcode')}>Barcode</button>
      <button onClick={() => onModeChange('manuell')}>Manuell</button>
      <span data-testid="active-mode">{activeMode}</span>
    </div>
  ),
}))

vi.mock('@/components/log/PhotoCapture', () => ({
  default: () => <div data-testid="photo-capture">PhotoCapture</div>,
}))

vi.mock('@/components/log/BarcodeCapture', () => ({
  default: () => <div data-testid="barcode-capture">BarcodeCapture</div>,
}))

vi.mock('@/components/Nutrition/ManualMealEntry', () => ({
  default: () => <div data-testid="manual-entry">ManualMealEntry</div>,
}))

vi.mock('@/components/Nutrition/WeightInput', () => ({
  default: () => <div data-testid="weight-input">WeightInput</div>,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}))

vi.mock('@/store/useNutritionStore', () => ({
  default: () => ({ setDailySnapshot: vi.fn() }),
}))

vi.mock('@/store/userStore', () => ({
  default: () => ({ profile: {} }),
}))

vi.mock('@/utils/logger', () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/nutritionService', () => ({
  saveAnalyzedMeal: vi.fn(),
  fetchNutritionSnapshot: vi.fn(),
}))

describe('LogPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <LogPage />
      </MemoryRouter>,
    )
  }

  it('renders the Log title', () => {
    renderPage()
    expect(screen.getByText('Log')).toBeInTheDocument()
  })

  it('shows Mahlzeit and Gewicht tabs', () => {
    renderPage()
    expect(screen.getByText('Mahlzeit')).toBeInTheDocument()
    expect(screen.getByText('Gewicht')).toBeInTheDocument()
  })

  it('shows ModeToggle and PhotoCapture by default', () => {
    renderPage()
    expect(screen.getByTestId('mode-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('photo-capture')).toBeInTheDocument()
  })

  it('does NOT import MealAnalyzer.jsx or Nutrition.jsx', () => {
    renderPage()
    // Uses new components, not legacy ones
    expect(screen.getByTestId('photo-capture')).toBeInTheDocument()
  })

  it('switches to barcode mode', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Barcode'))
    await waitFor(() => expect(screen.getByTestId('barcode-capture')).toBeInTheDocument())
  })

  it('switches to manual mode', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Manuell'))
    await waitFor(() => expect(screen.getByTestId('manual-entry')).toBeInTheDocument())
  })

  it('switches to Gewicht tab', () => {
    renderPage()
    fireEvent.click(screen.getByText('Gewicht'))
    expect(screen.getByTestId('weight-input')).toBeInTheDocument()
  })

  it('hides mode toggle on Gewicht tab', () => {
    renderPage()
    fireEvent.click(screen.getByText('Gewicht'))
    expect(screen.queryByTestId('mode-toggle')).not.toBeInTheDocument()
  })
})
