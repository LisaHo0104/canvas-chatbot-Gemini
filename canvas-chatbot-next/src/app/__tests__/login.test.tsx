import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  },
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render login form by default', () => {
    render(<LoginPage />)
    
    expect(screen.getByText('Canvas Chatbot')).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('should toggle between login and signup forms', async () => {
    render(<LoginPage />)
    
    const signUpButton = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(signUpButton)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back to sign in/i })).toBeInTheDocument()
    })
    
    const backToSignInButton = screen.getByRole('button', { name: /back to sign in/i })
    fireEvent.click(backToSignInButton)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
  })

  it('should show Canvas configuration after successful signup', async () => {
    const mockUser = { user: { id: '123', email: 'test@example.com' } }
    ;(supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({ data: mockUser, error: null })
    
    render(<LoginPage />)
    
    const signUpButton = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(signUpButton)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const createAccountButton = screen.getByRole('button', { name: /create account/i })
    
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    fireEvent.click(createAccountButton)
    
    await waitFor(() => {
      expect(screen.getByText(/canvas configuration/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/canvas institution/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/canvas api token/i)).toBeInTheDocument()
    })
  })

  it('should handle signup errors', async () => {
    const mockError = { error: { message: 'Email already exists' } }
    ;(supabase.auth.signUp as jest.Mock).mockResolvedValueOnce(mockError)
    
    render(<LoginPage />)
    
    const signUpButton = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(signUpButton)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const createAccountButton = screen.getByRole('button', { name: /create account/i })
    
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    fireEvent.click(createAccountButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
    })
  })

  it('should handle signin successfully', async () => {
    const mockUser = { user: { id: '123', email: 'test@example.com' } }
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({ data: mockUser, error: null })
    
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const signInButtons = screen.getAllByRole('button', { name: /sign in/i })
    const submitButton = signInButtons.find(button => button.type === 'submit')
    
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    if (submitButton) fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('should validate email format', async () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const signInButtons = screen.getAllByRole('button', { name: /sign in/i })
    const submitButton = signInButtons.find(button => button.type === 'submit')
    
    await userEvent.type(emailInput, 'invalid-email')
    await userEvent.type(passwordInput, 'password123')
    if (submitButton) fireEvent.click(submitButton)
    
    // The validation should prevent form submission
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('should validate password length', async () => {
    render(<LoginPage />)
    
    const signUpButton = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(signUpButton)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const createAccountButton = screen.getByRole('button', { name: /create account/i })
    
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, '123') // Too short
    fireEvent.click(createAccountButton)
    
    // The validation should prevent form submission
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('should show Canvas institution examples', () => {
    render(<LoginPage />)
    
    const signUpButton = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(signUpButton)
    
    const createAccountButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(createAccountButton)
    
    // Check that Canvas institution options are available
    const institutionSelect = screen.getByLabelText(/canvas institution/i)
    expect(institutionSelect).toBeInTheDocument()
    expect(institutionSelect.querySelector('option[value="https://canvas.mit.edu"]')).toBeInTheDocument()
    expect(institutionSelect.querySelector('option[value="https://canvas.harvard.edu"]')).toBeInTheDocument()
  })
})