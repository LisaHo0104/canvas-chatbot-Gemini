// Polar payment configuration
// Product ID: 11e3a7bc-3786-48ff-853a-7e14e960c1e1 (Premium Subscription, $29.99/month)

export const getPolarProductIds = () => ({
  pro: process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO!,
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
    price: 29.99,
    productId: process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO || '11e3a7bc-3786-48ff-853a-7e14e960c1e1',
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

