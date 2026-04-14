import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import ReviewPage from '@/pages/ReviewPage'

// Mock all child components to test orchestration only
vi.mock('@/components/review/HeuteTab', () => ({
  default: () => <div data-testid="heute-tab">HeuteTab Content</div>,
}))

vi.mock('@/components/review/WocheTab', () => ({
  default: () => <div data-testid="woche-tab">WocheTab Content</div>,
}))

vi.mock('@/components/review/HistorieTab', () => ({
  default: () => <div data-testid="historie-tab">HistorieTab Content</div>,
}))

vi.mock('@/components/Nutrition/CheckInFlow', () => ({
  default: () => <div data-testid="checkin-tab">CheckInFlow Content</div>,
}))

describe('ReviewPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <ReviewPage />
      </MemoryRouter>,
    )
  }

  it('renders the Review title', () => {
    renderPage()
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('shows all 4 tab labels', () => {
    renderPage()
    expect(screen.getByText('Heute')).toBeInTheDocument()
    expect(screen.getByText('Woche')).toBeInTheDocument()
    expect(screen.getByText('Historie')).toBeInTheDocument()
    expect(screen.getByText('Check-In')).toBeInTheDocument()
  })

  it('shows HeuteTab by default', () => {
    renderPage()
    expect(screen.getByTestId('heute-tab')).toBeInTheDocument()
  })

  it('does NOT import Dashboard.jsx', () => {
    renderPage()
    // HeuteTab is rendered, not Dashboard
    expect(screen.getByTestId('heute-tab')).toBeInTheDocument()
  })

  it('switches to Woche tab on click', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Woche'))
    await waitFor(() => expect(screen.getByTestId('woche-tab')).toBeInTheDocument())
  })

  it('switches to Historie tab on click', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Historie'))
    await waitFor(() => expect(screen.getByTestId('historie-tab')).toBeInTheDocument())
  })

  it('switches to Check-In tab on click', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Check-In'))
    await waitFor(() => expect(screen.getByTestId('checkin-tab')).toBeInTheDocument())
  })

  it('does NOT render inactive tabs', () => {
    renderPage()
    expect(screen.queryByTestId('woche-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('historie-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('checkin-tab')).not.toBeInTheDocument()
  })
})
