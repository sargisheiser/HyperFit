import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import IconRail from '@/components/IconRail'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1 },
    logout: vi.fn(),
  }),
}))

function renderWithRouter(path = '/review') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <IconRail />
    </MemoryRouter>,
  )
}

describe('IconRail', () => {
  it('renders the H logo', () => {
    renderWithRouter()
    expect(screen.getByText('H')).toBeInTheDocument()
  })

  it('renders all 4 nav labels', () => {
    renderWithRouter()
    expect(screen.getByText('Log')).toBeInTheDocument()
    expect(screen.getByText('Track')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
    expect(screen.getByText('Coach')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    renderWithRouter()
    expect(screen.getByTitle('Abmelden')).toBeInTheDocument()
  })

  it('has correct nav links', () => {
    renderWithRouter()
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/log')
    expect(hrefs).toContain('/track')
    expect(hrefs).toContain('/review')
    expect(hrefs).toContain('/coach')
    expect(hrefs).toContain('/profile')
  })
})
