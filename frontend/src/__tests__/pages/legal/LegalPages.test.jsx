import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Impressum from '@/pages/legal/Impressum'
import Datenschutz from '@/pages/legal/Datenschutz'
import AGB from '@/pages/legal/AGB'
import Widerruf from '@/pages/legal/Widerruf'

function renderWithRouter(component) {
  return render(<MemoryRouter>{component}</MemoryRouter>)
}

describe('Impressum', () => {
  it('renders the Impressum heading', () => {
    renderWithRouter(<Impressum />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Impressum')
  })

  it('contains required legal info sections', () => {
    renderWithRouter(<Impressum />)
    expect(screen.getByText(/Angaben gemäß § 5 TMG/)).toBeInTheDocument()
  })

  it('has a back link', () => {
    renderWithRouter(<Impressum />)
    expect(screen.getByRole('link', { name: /zurück/i })).toBeInTheDocument()
  })

  it('shows contact info', () => {
    renderWithRouter(<Impressum />)
    expect(screen.getByText(/kontakt@hyperfit.app/)).toBeInTheDocument()
  })
})

describe('Datenschutz', () => {
  it('renders the heading', () => {
    renderWithRouter(<Datenschutz />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Datenschutzerklärung')
  })

  it('mentions responsible party', () => {
    renderWithRouter(<Datenschutz />)
    expect(screen.getByText(/1. Verantwortlicher/)).toBeInTheDocument()
  })

  it('covers health data (Art. 9 DSGVO)', () => {
    renderWithRouter(<Datenschutz />)
    expect(screen.getByText(/3. Gesundheitsdaten/)).toBeInTheDocument()
  })

  it('lists user rights', () => {
    renderWithRouter(<Datenschutz />)
    expect(screen.getByText(/4. Ihre Rechte/)).toBeInTheDocument()
  })
})

describe('AGB', () => {
  it('renders the heading', () => {
    renderWithRouter(<AGB />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Allgemeine Geschäftsbedingungen')
  })

  it('contains scope section', () => {
    renderWithRouter(<AGB />)
    expect(screen.getByText(/§ 1 Geltungsbereich/)).toBeInTheDocument()
  })

  it('mentions premium subscription', () => {
    renderWithRouter(<AGB />)
    expect(screen.getByText(/§ 4 Premium-Abonnement/)).toBeInTheDocument()
  })
})

describe('Widerruf', () => {
  it('renders the heading', () => {
    renderWithRouter(<Widerruf />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Widerrufsbelehrung')
  })

  it('contains 14-day cancellation period', () => {
    renderWithRouter(<Widerruf />)
    expect(screen.getAllByText(/14 Tagen/).length).toBeGreaterThan(0)
  })

  it('explains cancellation procedure', () => {
    renderWithRouter(<Widerruf />)
    expect(screen.getByText(/Ausübung des Widerrufsrechts/)).toBeInTheDocument()
  })
})
