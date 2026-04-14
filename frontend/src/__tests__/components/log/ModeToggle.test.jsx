import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ModeToggle from '@/components/log/ModeToggle'

describe('ModeToggle', () => {
  it('renders all three mode buttons', () => {
    render(<ModeToggle activeMode="foto" onModeChange={vi.fn()} />)
    expect(screen.getByText('Foto')).toBeInTheDocument()
    expect(screen.getByText('Barcode')).toBeInTheDocument()
    expect(screen.getByText('Manuell')).toBeInTheDocument()
  })

  it('highlights the active mode with green', () => {
    render(<ModeToggle activeMode="barcode" onModeChange={vi.fn()} />)
    const barcodeBtn = screen.getByText('Barcode').closest('button')
    expect(barcodeBtn.className).toContain('text-[#00FF7F]')
  })

  it('calls onModeChange when a mode is clicked', () => {
    const onChange = vi.fn()
    render(<ModeToggle activeMode="foto" onModeChange={onChange} />)
    fireEvent.click(screen.getByText('Manuell'))
    expect(onChange).toHaveBeenCalledWith('manuell')
  })

  it('marks inactive modes with muted color', () => {
    render(<ModeToggle activeMode="foto" onModeChange={vi.fn()} />)
    const manualBtn = screen.getByText('Manuell').closest('button')
    expect(manualBtn.className).toContain('text-white/40')
  })
})
