import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Footer from '@/components/Footer'

describe('Footer', () => {
  it('renders all 4 legal links', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    expect(screen.getByText('Impressum')).toBeInTheDocument()
    expect(screen.getByText('Datenschutz')).toBeInTheDocument()
    expect(screen.getByText('AGB')).toBeInTheDocument()
    expect(screen.getByText('Widerruf')).toBeInTheDocument()
  })

  it('links point to correct routes', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/impressum')
    expect(hrefs).toContain('/datenschutz')
    expect(hrefs).toContain('/agb')
    expect(hrefs).toContain('/widerruf')
  })

  it('shows copyright text', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    expect(screen.getByText(/HYPERFIT/)).toBeInTheDocument()
  })
})
