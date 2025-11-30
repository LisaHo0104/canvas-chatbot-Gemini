import { render, screen } from '@testing-library/react'
import { Modal } from '../molecules/Modal'

describe('Modal', () => {
  it('renders content when open', () => {
    render(<Modal title="Title" open={true} onOpenChange={() => {}}><p>Content</p></Modal>)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})