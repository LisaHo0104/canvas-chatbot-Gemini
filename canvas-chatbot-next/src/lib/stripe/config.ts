
// Client-side configuration
export const getStripePublishableKey = () => {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
}

export const getStripePriceIds = () => ({
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!,
})

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Best for trying things out',
    price: 0,
    features: [
      'Up to 100 API calls per month',
      'Core AI model access',
      'Community support',
    ],
    popular: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Ideal for growing teams and businesses',
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!,
    features: [
      'Up to 1,000 API calls per month',
      'Advanced AI models',
      'Priority support',
      'Faster response time',
      'Advanced analytics',
      'Team collaboration',
    ],
    popular: true,
  },
} as const

export type PlanId = keyof typeof PLANS
