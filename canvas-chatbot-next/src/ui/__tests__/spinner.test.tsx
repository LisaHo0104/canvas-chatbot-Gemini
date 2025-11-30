import { render, screen } from '@testing-library/react'
import { Spinner } from '../atoms/Spinner'

describe('Spinner', () => {
  it('renders with aria-label', () => {
    render(<Spinner size={16} />)
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })
})