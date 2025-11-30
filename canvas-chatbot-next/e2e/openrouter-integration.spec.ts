import { test, expect } from '@playwright/test'

test.describe('OpenRouter Integration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login')
    
    // Fill in login form
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    
    // Submit login form
    await page.click('button[type="submit"]')
    
    // Wait for navigation to chat page
    await page.waitForURL('/chat')
  })

  test('should display AI provider settings in sidebar', async ({ page }) => {
    // Check that sidebar contains provider information
    await expect(page.locator('text=Active Provider')).toBeVisible()
    await expect(page.locator('text=Switch Provider')).toBeVisible()
    
    // Click on settings link
    await page.click('text=Settings')
    await page.waitForURL('/settings')
    
    // Navigate to AI providers settings
    await page.click('text=AI Providers')
    await page.waitForURL('/settings/ai-providers')
    
    // Check page content
    await expect(page.locator('h1:has-text("AI Provider Settings")')).toBeVisible()
    await expect(page.locator('text=Configure and manage your AI providers')).toBeVisible()
  })

  test('should add new OpenRouter provider', async ({ page }) => {
    // Navigate to AI providers settings
    await page.goto('/settings/ai-providers')
    
    // Click add provider button
    await page.click('text=Add Provider')
    
    // Fill in provider form
    await page.selectOption('select[id="provider"]', 'openrouter')
    await page.fill('input[id="apiKey"]', 'sk-or-v1-test-api-key-123456789')
    
    // Test connection
    await page.click('text=Test Connection')
    
    // Wait for connection test result
    await page.waitForTimeout(2000)
    
    // Submit form
    await page.click('button:has-text("Add")')
    
    // Wait for success message
    await expect(page.locator('text=Provider added successfully')).toBeVisible({ timeout: 5000 })
  })

  test('should switch between AI providers', async ({ page }) => {
    // Start from chat page
    await page.goto('/chat')
    
    // Click switch provider button
    await page.click('text=Switch Provider')
    
    // Select different provider from dropdown
    await page.click('text=Claude 3.5 Sonnet')
    
    // Verify provider switch
    await expect(page.locator('text=Provider switched to Claude 3.5 Sonnet')).toBeVisible({ timeout: 5000 })
  })

  test('should send message with OpenRouter provider', async ({ page }) => {
    // Start from chat page
    await page.goto('/chat')
    
    // Send a test message
    await page.fill('textarea[placeholder*="Type your message"]'), 'What is the capital of France?')
    await page.click('button:has-text("Send")')
    
    // Wait for response
    await expect(page.locator('text=Paris')).toBeVisible({ timeout: 10000 })
    
    // Verify provider indicator is shown
    await expect(page.locator('text=OpenRouter')).toBeVisible()
  })

  test('should handle OpenRouter API errors gracefully', async ({ page }) => {
    // Navigate to AI providers settings
    await page.goto('/settings/ai-providers')
    
    // Add provider with invalid API key
    await page.click('text=Add Provider')
    await page.selectOption('select[id="provider"]', 'openrouter')
    await page.fill('input[id="apiKey"]', 'invalid-api-key')
    
    // Test connection
    await page.click('text=Test Connection')
    
    // Should show error message
    await expect(page.locator('text=Connection test failed')).toBeVisible({ timeout: 5000 })
  })

  test('should display usage statistics', async ({ page }) => {
    // Navigate to AI providers settings
    await page.goto('/settings/ai-providers')
    
    // Click usage stats button
    await page.click('text=Usage Stats')
    
    // Check usage statistics modal
    await expect(page.locator('h2:has-text("Provider Usage Statistics")')).toBeVisible()
    await expect(page.locator('text=Total Requests')).toBeVisible()
    await expect(page.locator('text=Total Tokens')).toBeVisible()
    await expect(page.locator('text=Total Cost')).toBeVisible()
    
    // Close modal
    await page.click('text=Close')
  })

  test('should edit existing provider', async ({ page }) => {
    // Navigate to AI providers settings
    await page.goto('/settings/ai-providers')
    
    // Click edit button
    await page.click('text=Edit')
    
    // Change model
    await page.selectOption('select[id="model"]', 'claude-3.5-sonnet')
    
    // Update API key
    await page.fill('input[id="apiKey"]', 'sk-or-v1-new-api-key-987654321')
    
    // Submit form
    await page.click('button:has-text("Update")')
    
    // Verify update
    await expect(page.locator('text=Provider updated successfully')).toBeVisible({ timeout: 5000 })
  })

  test('should delete provider with confirmation', async ({ page }) => {
    // Navigate to AI providers settings
    await page.goto('/settings/ai-providers')
    
    // Click delete button
    await page.click('text=Delete')
    
    // Handle confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete this AI provider?')
      await dialog.accept()
    })
    
    // Verify deletion
    await expect(page.locator('text=Provider deleted successfully')).toBeVisible({ timeout: 5000 })
  })

  test('should handle rate limiting', async ({ page }) => {
    // Send multiple messages quickly
    await page.goto('/chat')
    
    for (let i = 0; i < 5; i++) {
      await page.fill('textarea[placeholder*="Type your message"]'), `Test message ${i}`)
      await page.click('button:has-text("Send")')
      await page.waitForTimeout(500)
    }
    
    // Should show rate limit warning
    await expect(page.locator('text=Rate limit exceeded')).toBeVisible({ timeout: 5000 })
  })

  test('should maintain chat history with provider information', async ({ page }) => {
    // Start chat session
    await page.goto('/chat')
    
    // Send multiple messages
    const messages = ['Hello', 'How are you?', 'What can you help me with?']
    
    for (const message of messages) {
      await page.fill('textarea[placeholder*="Type your message"]'), message)
      await page.click('button:has-text("Send")')
      await page.waitForTimeout(2000)
    }
    
    // Verify chat history shows provider information
    await expect(page.locator('text=OpenRouter')).toHaveCount(messages.length)
    
    // Verify messages are preserved
    for (const message of messages) {
      await expect(page.locator(`text=${message}`)).toBeVisible()
    }
  })

  test('should handle provider switching during active chat', async ({ page }) => {
    // Start chat session
    await page.goto('/chat')
    
    // Send initial message
    await page.fill('textarea[placeholder*="Type your message"]'), 'Hello with current provider')
    await page.click('button:has-text("Send")')
    await page.waitForTimeout(2000)
    
    // Switch provider mid-conversation
    await page.click('text=Switch Provider')
    await page.click('text=GPT-4')
    
    // Continue conversation with new provider
    await page.fill('textarea[placeholder*="Type your message"]'), 'Now with GPT-4')
    await page.click('button:has-text("Send")')
    
    // Verify both providers are shown in chat history
    await expect(page.locator('text=OpenRouter')).toBeVisible()
    await expect(page.locator('text=GPT-4')).toBeVisible()
  })

  test('should apply OpenRouter model from Settings without refresh', async ({ page }) => {
    await page.goto('/settings/ai-providers')
    await page.selectOption('select#model', 'openai/gpt-4')

    await page.route('/api/chat', async route => {
      const req = route.request()
      const body = req.postDataJSON() as any
      if (body && body.model_override) {
        expect(body.model_override).toBe('openai/gpt-4')
      }
      await route.continue()
    })

    await page.goto('/chat')
    await page.fill('textarea[placeholder*="Type your message"]', 'Test OpenRouter model override')
    await page.click('button:has-text("Send")')
    await expect(page.locator('text=OpenRouter')).toBeVisible()
  })

  test('should validate API key format', async ({ page }) => {
    // Navigate to AI providers settings
    await page.goto('/settings/ai-providers')
    
    // Click add provider
    await page.click('text=Add Provider')
    
    // Try to submit with invalid API key format
    await page.selectOption('select[id="provider"]', 'openrouter')
    await page.fill('input[id="apiKey"]', 'invalid-key-format')
    
    // Should show validation error
    await expect(page.locator('text=Invalid API key format')).toBeVisible({ timeout: 5000 })
  })

  test('should show loading states during operations', async ({ page }) => {
    // Navigate to AI providers settings
    await page.goto('/settings/ai-providers')
    
    // Add provider
    await page.click('text=Add Provider')
    await page.fill('input[id="apiKey"]', 'sk-or-v1-test-key')
    
    // Test connection (should show loading)
    await page.click('text=Test Connection')
    await expect(page.locator('text=Testing...')).toBeVisible()
    
    // Submit form (should show saving)
    await page.click('button:has-text("Add")')
    await expect(page.locator('text=Saving...')).toBeVisible()
  })
})