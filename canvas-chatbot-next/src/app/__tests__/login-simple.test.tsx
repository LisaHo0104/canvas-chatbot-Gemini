import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from '@/app/login/page'

describe('LoginPage - Simple Tests', () => {
  it('should render the main heading', () => {
    render(<LoginPage />)
    expect(screen.getByText('Canvas Chatbot')).toBeInTheDocument()
  })

  it('should render email and password inputs', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('should render sign in and sign up buttons', () => {
    render(<LoginPage />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    expect(screen.getByText(/sign up/i)).toBeInTheDocument()
  })

  it('should toggle to signup form', () => {
    render(<LoginPage />)
    const signUpButton = screen.getByText(/sign up/i)
    fireEvent.click(signUpButton)
    expect(screen.getByText(/create account/i)).toBeInTheDocument()
  })

  it('should show Canvas configuration form after signup toggle', () => {
    render(<LoginPage />)
    const signUpButton = screen.getByText(/sign up/i)
    fireEvent.click(signUpButton)
    const createAccountButton = screen.getByText(/create account/i)
    fireEvent.click(createAccountButton)
    
    expect(screen.getByLabelText(/canvas institution/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/canvas api token/i)).toBeInTheDocument()
  })

  it('should show Canvas token instructions', () => {
    render(<LoginPage />)
    expect(screen.getByText(/how to get your canvas api token/i)).toBeInTheDocument()
  })
})