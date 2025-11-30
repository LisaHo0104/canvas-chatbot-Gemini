import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../atoms/Button'

describe('Button', () => {
  it('renders and triggers click', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click Me</Button>)
    const btn = screen.getByRole('button', { name: 'Click Me' })
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalled()
  })

  it('supports size and variant', () => {
    render(<Button size="lg" variant="outline">Test</Button>)
    expect(screen.getByRole('button', { name: 'Test' })).toBeInTheDocument()
  })
})