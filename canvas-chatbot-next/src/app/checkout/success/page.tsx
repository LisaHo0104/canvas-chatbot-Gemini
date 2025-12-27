'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle, Clock, CreditCard, ArrowRight, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function CheckoutSuccessContent() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)

  useEffect(() => {
    // Polar redirects to success URL after checkout
    // No session_id needed - just fetch user's subscription
    const verifySubscription = async () => {
      try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          toast.error('Please sign in to view your subscription')
          router.push('/auth/login')
          return
        }

        // Get user subscription data (schema from NEXT_PUBLIC_SUPABASE_SCHEMA env var)
        const { data: subscriptionData, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (subError && subError.code !== 'PGRST116') {
          console.error('Failed to fetch subscription:', subError)
          // Still show success message even if we can't fetch details
          setSessionData({ status: 'complete' })
        } else {
          setSessionData(subscriptionData || { status: 'complete' })
        }
      } catch (error) {
        console.error('Subscription verification error:', error)
        toast.error('Failed to verify subscription')
      } finally {
        setIsLoading(false)
      }
    }

    verifySubscription()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner className="h-12 w-12 mx-auto" />
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Your subscription has been activated and you now have access to all features.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>
              Your subscription is now active. Here are the details:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Status</span>
              </div>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                Active
              </Badge>
            </div>
            
            {sessionData && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Next Billing Date</span>
                  </div>
                  <span className="text-gray-600">
                    {sessionData.current_period_end 
                      ? new Date(sessionData.current_period_end).toLocaleDateString()
                      : 'Processing...'
                    }
                  </span>
                </div>
                
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">Plan</span>
                  </div>
                  <span className="text-gray-600 capitalize">
                    {sessionData.polar_product_id === '11e3a7bc-3786-48ff-853a-7e14e960c1e1' 
                      ? 'Premium Subscription' 
                      : 'Pro Plan'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Button
            onClick={() => router.push('/protected')}
            className="w-full"
            size="lg"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <Separator />
          
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You should receive a confirmation email shortly.
            </p>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => router.push('/account/billing')}
                className="w-full"
              >
                Manage Subscription
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => router.push('/pricing')}
                className="w-full"
              >
                View All Plans
              </Button>
            </div>
          </div>
        </div>

        <Alert className="mt-8">
          <Info className="h-4 w-4" />
          <AlertTitle>What's Next?</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Your subscription is immediately active</li>
              <li>You can access all features in your dashboard</li>
              <li>Manage your subscription in account settings</li>
              <li>Contact support if you need help</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Spinner className="h-12 w-12 mx-auto" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
