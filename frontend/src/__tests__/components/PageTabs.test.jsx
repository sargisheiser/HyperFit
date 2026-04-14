import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PageTabs from '@/components/PageTabs'

describe('PageTabs', () => {
  const tabs = [
    { id: 'a', label: 'Tab A' },
    { id: 'b', label: 'Tab B' },
    { id: 'c', label: 'Tab C' },
  ]

  it('renders all tab labels', () => {
    render(<PageTabs tabs={tabs} activeTab="a" onTabChange={vi.fn()} />)
    expect(screen.getByText('Tab A')).toBeInTheDocument()
    expect(screen.getByText('Tab B')).toBeInTheDocument()
    expect(screen.getByText('Tab C')).toBeInTheDocument()
  })

  it('highlights the active tab with green color', () => {
    render(<PageTabs tabs={tabs} activeTab="b" onTabChange={vi.fn()} />)
    const activeButton = screen.getByText('Tab B')
    expect(activeButton.className).toContain('text-[#00FF7F]')
  })

  it('calls onTabChange when a tab is clicked', () => {
    const onChange = vi.fn()
    render(<PageTabs tabs={tabs} activeTab="a" onTabChange={onChange} />)
    fireEvent.click(screen.getByText('Tab C'))
    expect(onChange).toHaveBeenCalledWith('c')
  })

  it('does not highlight inactive tabs', () => {
    render(<PageTabs tabs={tabs} activeTab="a" onTabChange={vi.fn()} />)
    const inactiveButton = screen.getByText('Tab B')
    expect(inactiveButton.className).toContain('text-white/40')
  })
})
