import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.locator('h1')).toContainText('Canvas Chatbot')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
    await expect(page.locator('button:has-text("Sign Up")')).toBeVisible()
  })

  test('should toggle between login and signup forms', async ({ page }) => {
    await page.goto('/login')
    
    // Click Sign Up button
    await page.locator('button:has-text("Sign Up")').click()
    
    // Should show signup form
    await expect(page.locator('button:has-text("Create Account")')).toBeVisible()
    await expect(page.locator('button:has-text("Back to Sign In")')).toBeVisible()
    
    // Click Back to Sign In button
    await page.locator('button:has-text("Back to Sign In")').click()
    
    // Should show login form again
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
    await expect(page.locator('button:has-text("Sign Up")')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/login')
    
    // Enter invalid email
    await page.locator('input[type="email"]').fill('invalid-email')
    await page.locator('input[type="password"]').fill('password123')
    await page.locator('button:has-text("Sign In")').click()
    
    // Should show validation error
    await expect(page.locator('text=Please enter a valid email')).toBeVisible()
  })

  test('should validate password length for signup', async ({ page }) => {
    await page.goto('/login')
    
    // Click Sign Up button
    await page.locator('button:has-text("Sign Up")').click()
    
    // Enter short password
    await page.locator('input[type="email"]').fill('test@example.com')
    await page.locator('input[type="password"]').fill('123')
    await page.locator('button:has-text("Create Account")').click()
    
    // Should show validation error
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible()
  })

  test('should show Canvas configuration after signup', async ({ page }) => {
    await page.goto('/login')
    
    // Click Sign Up button
    await page.locator('button:has-text("Sign Up")').click()
    
    // Fill signup form
    await page.locator('input[type="email"]').fill('test@example.com')
    await page.locator('input[type="password"]').fill('password123')
    
    // Mock successful signup
    await page.route('**/api/auth/signup', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'test-token' }
        })
      })
    })
    
    await page.locator('button:has-text("Create Account")').click()
    
    // Should show Canvas configuration
    await expect(page.locator('text=Canvas Configuration')).toBeVisible()
    await expect(page.locator('input[placeholder="your-school.instructure.com"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Canvas API Token"]')).toBeVisible()
  })

  test('should handle login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill login form
    await page.locator('input[type="email"]').fill('test@example.com')
    await page.locator('input[type="password"]').fill('password123')
    
    // Mock successful login
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'test-token' }
        })
      })
    })
    
    await page.locator('button:has-text("Sign In")').click()
    
    // Should redirect to chat page
    await expect(page).toHaveURL('/chat')
  })

  test('should handle login errors', async ({ page }) => {
    await page.goto('/login')
    
    // Fill login form
    await page.locator('input[type="email"]').fill('test@example.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    
    // Mock failed login
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid credentials'
        })
      })
    })
    
    await page.locator('button:has-text("Sign In")').click()
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })
})

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing chat without authentication', async ({ page }) => {
    await page.goto('/chat')
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login')
    await expect(page.locator('text=Please sign in to continue')).toBeVisible()
  })
})