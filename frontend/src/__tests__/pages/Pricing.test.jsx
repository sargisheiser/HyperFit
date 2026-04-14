import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Pricing from '@/pages/Pricing'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { is_premium: false, tier: 'free', status: 'active' } }),
    post: vi.fn().mockResolvedValue({ data: { checkout_url: 'https://checkout.stripe.com/test', session_id: 'cs_123' } }),
  },
}))

vi.mock('@/utils/logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function renderPricing() {
  return render(
    <MemoryRouter>
      <Pricing />
    </MemoryRouter>,
  )
}

describe('Pricing', () => {
  it('renders Free and Pro plan titles', async () => {
    renderPricing()
    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument()
      expect(screen.getByText('Pro')).toBeInTheDocument()
    })
  })

  it('shows €0 for free plan', async () => {
    renderPricing()
    await waitFor(() => {
      expect(screen.getByText('€0')).toBeInTheDocument()
    })
  })

  it('shows yearly pricing by default', async () => {
    renderPricing()
    await waitFor(() => {
      expect(screen.getByText('€6,67')).toBeInTheDocument()
    })
  })

  it('switches to monthly pricing', async () => {
    renderPricing()
    await waitFor(() => screen.getByText('€6,67'))
    fireEvent.click(screen.getByText('Monatlich'))
    expect(screen.getByText('€8,99')).toBeInTheDocument()
  })

  it('shows free plan features', async () => {
    renderPricing()
    await waitFor(() => {
      expect(screen.getByText('3 KI-Analysen pro Tag')).toBeInTheDocument()
      expect(screen.getByText('Barcode-Scanner')).toBeInTheDocument()
    })
  })

  it('shows pro plan features', async () => {
    renderPricing()
    await waitFor(() => {
      expect(screen.getByText('Unbegrenzte KI-Analysen')).toBeInTheDocument()
      expect(screen.getByText('KI-Fitness-Coach')).toBeInTheDocument()
    })
  })

  it('shows "Aktueller Plan" for free tier when not premium', async () => {
    renderPricing()
    await waitFor(() => {
      expect(screen.getByText('Aktueller Plan')).toBeInTheDocument()
    })
  })

  it('shows upgrade button for pro plan', async () => {
    renderPricing()
    await waitFor(() => {
      expect(screen.getByText('Jetzt upgraden')).toBeInTheDocument()
    })
  })

  it('shows trust footer', async () => {
    renderPricing()
    await waitFor(() => {
      expect(screen.getByText(/Jederzeit kündbar/)).toBeInTheDocument()
    })
  })
})
