import 'server-only'

// Polar doesn't require a server-side SDK initialization like Stripe
// The @polar-sh/nextjs package handles all the API interactions
// This file is kept for consistency and potential future Polar client initialization

export const getPolarAccessToken = () => {
  const token = process.env.POLAR_ACCESS_TOKEN
  if (!token) {
    throw new Error('Missing POLAR_ACCESS_TOKEN')
  }
  return token
}

export const getPolarWebhookSecret = () => {
  const secret = process.env.POLAR_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('Missing POLAR_WEBHOOK_SECRET')
  }
  return secret
}

