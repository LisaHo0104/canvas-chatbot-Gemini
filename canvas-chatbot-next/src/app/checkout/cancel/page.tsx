'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, MessageCircle, CreditCard } from 'lucide-react'

export default function CheckoutCancelPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-lg text-gray-600">
            Your payment was cancelled and no charges were made to your account.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What happened?</CardTitle>
            <CardDescription>
              Your checkout session was cancelled. This can happen for several reasons:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <div className="h-2 w-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                <span>You closed the checkout window</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-2 w-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                <span>There was a network or browser issue</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-2 w-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                <span>You clicked the back button or refreshed the page</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Button
            onClick={() => router.push('/pricing')}
            className="w-full bg-blue-500 hover:bg-blue-600"
            size="lg"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/protected')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push('/pricing')}
              className="w-full"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-sm text-blue-800 mb-3">
            If you're experiencing issues with payment processing, our support team is here to help.
          </p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Check that your payment method has sufficient funds</li>
            <li>• Ensure your card is enabled for online transactions</li>
            <li>• Try using a different browser or device</li>
            <li>• Contact your bank if the issue persists</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            If you continue to experience issues, please{' '}
            <button
              onClick={() => router.push('/contact')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              contact our support team
            </button>{' '}
            and we'll help you resolve the issue quickly.
          </p>
        </div>
      </div>
    </div>
  )
}