import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../atoms/Input'

describe('Input', () => {
  it('renders and accepts input', () => {
    render(<Input aria-label="Email" />)
    const el = screen.getByLabelText('Email')
    fireEvent.change(el, { target: { value: 'a@b.com' } })
    expect((el as HTMLInputElement).value).toBe('a@b.com')
  })
})