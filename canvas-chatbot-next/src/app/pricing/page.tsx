'use client'

import { useState, useEffect } from 'react'
import { PricingCard } from '@/components/pricing/PricingCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { PLANS, PlanId } from '@/lib/polar/config'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [products, setProducts] = useState<any[] | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const checkSubscription = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        // User not authenticated, show pricing cards
        setIsCheckingSubscription(false)
        return
      }

      // Fetch subscription data (schema from NEXT_PUBLIC_SUPABASE_SCHEMA env var)
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (subError && subError.code !== 'PGRST116') {
        console.error('Failed to fetch subscription:', subError)
        // If error fetching, still show pricing page
        setIsCheckingSubscription(false)
        return
      } else if (subData) {
        // Check if user has active subscription
        const hasActiveSubscription = subData.status === 'active' || subData.status === 'trialing'
        
        if (hasActiveSubscription) {
          // Set redirect flag to prevent rendering, then redirect
          setShouldRedirect(true)
          // Use hard redirect to immediately navigate away
          window.location.href = '/account/billing'
          return
        }
      }
      
      // No active subscription, show pricing page
      setIsCheckingSubscription(false)
    } catch (error) {
      console.error('Failed to check subscription:', error)
      // On error, show pricing page
      setIsCheckingSubscription(false)
    }
  }

  const handlePlanSelect = async (planId: PlanId) => {
    setIsLoading(planId)

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error('Please sign in to continue')
        router.push('/auth/login?redirectTo=/pricing')
        return
      }

      const plan = PLANS[planId]

      if (planId === 'free') {
        const res = await fetch('/api/select-free-plan', { method: 'POST' })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to select free plan')
        }
        toast.success('Free plan selected')
        router.push('/')
        return
      }

      // Polar checkout uses GET with query params
      const productId = 'productId' in plan ? plan.productId : undefined
      if (!productId) {
        throw new Error('Product ID not found')
      }

      // Build checkout URL with customerExternalId (maps to auth.users.id)
      const checkoutUrl = `/checkout?products=${productId}&customerExternalId=${user.id}&customerEmail=${encodeURIComponent(user.email!)}`
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
    } finally {
      setIsLoading(null)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      // Fallback to hardcoded plans if fetch fails
    }
  }

  useEffect(() => {
    checkSubscription()
    fetchProducts()
  }, [])

  // If redirecting, keep showing loading state
  if (shouldRedirect) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner className="h-12 w-12 mx-auto" />
          <p className="text-muted-foreground">Redirecting to subscription management...</p>
        </div>
      </div>
    )
  }

  if (isCheckingSubscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner className="h-12 w-12 mx-auto" />
          <p className="text-muted-foreground">Loading pricing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center mb-8">
          <img src="/dog_rocket.png" alt="Pricing illustration" width={120} height={120} />
        </div>
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All plans include core features with varying limits.
          </p>
        </div>

        <Separator className="mb-12" />

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {Object.entries(PLANS).map(([planId, plan]) => (
            <PricingCard
              key={planId}
              plan={{
                ...plan,
                price: plan.price,
              }}
              isLoading={isLoading === planId}
              onSelect={handlePlanSelect}
            />
          ))}
        </div>
        
        <Separator className="mb-12" />

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time from your account settings.
              </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                We offer a 14-day free trial on all plans. No credit card required to start.
              </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                We accept all major credit cards, including Visa, Mastercard, and American Express.
              </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                Yes, you can cancel your subscription at any time from your account settings.
              </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
