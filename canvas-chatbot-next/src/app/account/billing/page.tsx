'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  CreditCard, 
  Calendar, 
  ExternalLink, 
  Settings,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

interface SubscriptionData {
  id: string
  status: string
  polar_product_id: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
}

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [isPortalLoading, setIsPortalLoading] = useState(false)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error('Please sign in to view billing information')
        router.push('/auth/login')
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
      } else if (subData) {
        setSubscription(subData)
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error)
      toast.error('Failed to load billing information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsPortalLoading(true)
    
    try {
      // Redirect to Polar Customer Portal (GET route)
      window.location.href = '/portal'
    } catch (error) {
      console.error('Portal creation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal')
    } finally {
      setIsPortalLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>
      case 'incomplete':
        return <Badge className="bg-gray-100 text-gray-800">Incomplete</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPlanName = (productId: string) => {
    // Check if it's the Premium Subscription product ID
    if (productId === '11e3a7bc-3786-48ff-853a-7e14e960c1e1' || productId.includes('11e3a7bc')) {
      return 'Premium Subscription'
    }
    return 'Pro Plan'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your subscription and billing history</p>
        </div>

        {/* Current Subscription */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getPlanName(subscription.polar_product_id)}</p>
                    <p className="text-sm text-gray-600">Monthly billing</p>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Current Period</p>
                      <p className="font-medium">
                        {format(new Date(subscription.current_period_start), 'MMM d, yyyy')} - 
                        {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  {subscription.cancel_at_period_end && (
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-medium text-yellow-600">Cancels at period end</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isPortalLoading}
                    className="w-full md:w-auto"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {isPortalLoading ? 'Loading...' : 'Manage Subscription'}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No active subscription found</p>
                <Button onClick={() => router.push('/pricing')}>
                  View Pricing Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}