import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FoodItemList from '@/components/log/FoodItemList'

const mockItems = [
  { name: 'Spaghetti Bolognese', quantity: '350g', calories: 480, protein_grams: 22, carbs_grams: 55, fat_grams: 15, confidence: 0.92 },
  { name: 'Parmesan', quantity: '20g', calories: 100, protein_grams: 8, carbs_grams: 0, fat_grams: 7, confidence: 0.88 },
]

describe('FoodItemList', () => {
  it('renders all food item names', () => {
    render(<FoodItemList items={mockItems} onUpdateQuantity={vi.fn()} />)
    expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument()
    expect(screen.getByText('Parmesan')).toBeInTheDocument()
  })

  it('shows quantity and calories for each item', () => {
    render(<FoodItemList items={mockItems} onUpdateQuantity={vi.fn()} />)
    expect(screen.getByText('350g · 480 kcal')).toBeInTheDocument()
    expect(screen.getByText('20g · 100 kcal')).toBeInTheDocument()
  })

  it('expands item on click to show macros', () => {
    render(<FoodItemList items={mockItems} onUpdateQuantity={vi.fn()} />)
    fireEvent.click(screen.getByText('Spaghetti Bolognese'))
    expect(screen.getByText('P 22g')).toBeInTheDocument()
    expect(screen.getByText('C 55g')).toBeInTheDocument()
    expect(screen.getByText('F 15g')).toBeInTheDocument()
  })

  it('shows edit button when expanded', () => {
    render(<FoodItemList items={mockItems} onUpdateQuantity={vi.fn()} />)
    fireEvent.click(screen.getByText('Spaghetti Bolognese'))
    expect(screen.getByText('Menge bearbeiten')).toBeInTheDocument()
  })

  it('returns null for empty items', () => {
    const { container } = render(<FoodItemList items={[]} onUpdateQuantity={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null for undefined items', () => {
    const { container } = render(<FoodItemList items={undefined} onUpdateQuantity={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('calls onUpdateQuantity when edit is confirmed', () => {
    const onUpdate = vi.fn()
    render(<FoodItemList items={mockItems} onUpdateQuantity={onUpdate} />)

    // Expand item
    fireEvent.click(screen.getByText('Spaghetti Bolognese'))

    // Click edit
    fireEvent.click(screen.getByText('Menge bearbeiten'))

    // Type new quantity and press Enter
    const input = screen.getByPlaceholderText('z.B. 150g')
    fireEvent.change(input, { target: { value: '200g' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onUpdate).toHaveBeenCalledWith(0, '200g')
  })
})
