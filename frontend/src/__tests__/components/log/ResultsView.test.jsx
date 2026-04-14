import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ResultsView from '@/components/log/ResultsView'

const mockAnalysis = {
  total_calories: 580,
  confidence_score: 0.92,
  food_items: [
    { name: 'Spaghetti Bolognese', quantity: '350g', calories: 480, protein_grams: 22, carbs_grams: 55, fat_grams: 15 },
    { name: 'Parmesan', quantity: '20g', calories: 100, protein_grams: 8, carbs_grams: 0, fat_grams: 7 },
  ],
  macronutrients: {
    protein_grams: 30,
    carbs_grams: 55,
    fat_grams: 22,
  },
}

describe('ResultsView', () => {
  it('renders the success header', () => {
    render(<ResultsView analysis={mockAnalysis} onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByText('Mahlzeit analysiert')).toBeInTheDocument()
  })

  it('displays total calories prominently', () => {
    render(<ResultsView analysis={mockAnalysis} onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByText('580')).toBeInTheDocument()
    expect(screen.getByText('Kalorien')).toBeInTheDocument()
  })

  it('shows confidence score', () => {
    render(<ResultsView analysis={mockAnalysis} onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByText(/92%/)).toBeInTheDocument()
  })

  it('displays macro circles with correct values', () => {
    render(<ResultsView analysis={mockAnalysis} onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByText('30')).toBeInTheDocument() // protein
    expect(screen.getByText('55')).toBeInTheDocument() // carbs
    expect(screen.getByText('22')).toBeInTheDocument() // fat
    expect(screen.getByText('Protein')).toBeInTheDocument()
    expect(screen.getByText('Carbs')).toBeInTheDocument()
    expect(screen.getByText('Fett')).toBeInTheDocument()
  })

  it('shows food items', () => {
    render(<ResultsView analysis={mockAnalysis} onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument()
    expect(screen.getByText('Parmesan')).toBeInTheDocument()
  })

  it('renders Save and Discard buttons', () => {
    render(<ResultsView analysis={mockAnalysis} onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByText('Mahlzeit speichern')).toBeInTheDocument()
    expect(screen.getByText('Verwerfen')).toBeInTheDocument()
  })

  it('calls onSave when save button clicked', async () => {
    const onSave = vi.fn().mockResolvedValue()
    render(<ResultsView analysis={mockAnalysis} onSave={onSave} onDiscard={vi.fn()} />)
    fireEvent.click(screen.getByText('Mahlzeit speichern'))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })

  it('calls onDiscard when discard button clicked', () => {
    const onDiscard = vi.fn()
    render(<ResultsView analysis={mockAnalysis} onSave={vi.fn()} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByText('Verwerfen'))
    expect(onDiscard).toHaveBeenCalled()
  })

  it('shows saving state when save is in progress', async () => {
    const onSave = vi.fn(() => new Promise(() => {})) // never resolves
    render(<ResultsView analysis={mockAnalysis} onSave={onSave} onDiscard={vi.fn()} />)
    fireEvent.click(screen.getByText('Mahlzeit speichern'))
    await waitFor(() => expect(screen.getByText('Speichern...')).toBeInTheDocument())
  })
})
