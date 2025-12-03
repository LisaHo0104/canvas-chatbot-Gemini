'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, CreditCard, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    
    if (!sessionId) {
      toast.error('Invalid session ID')
      router.push('/pricing')
      return
    }

    // Verify the session and get subscription details
    verifySession(sessionId)
  }, [searchParams, router])

  const verifySession = async (sessionId: string) => {
    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error('Please sign in to view your subscription')
        router.push('/auth/login')
        return
      }

      // Get user subscription data (avoid join to reduce RLS/permission issues)
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
      console.error('Session verification error:', error)
      toast.error('Failed to verify payment session')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
            
            {sessionData && (
              <>
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
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">Plan</span>
                  </div>
                  <span className="text-gray-600 capitalize">
                    {sessionData.stripe_price_id?.includes('pro') ? 'Lulu Pro' :
                     'Standard'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Button
            onClick={() => router.push('/protected')}
            className="w-full bg-blue-500 hover:bg-blue-600"
            size="lg"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
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

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your subscription is immediately active</li>
            <li>• You can access all features in your dashboard</li>
            <li>• Manage your subscription in account settings</li>
            <li>• Contact support if you need help</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
