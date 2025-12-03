import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { DatabaseService } from '@/lib/stripe/database'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createPortalSessionSchema = z.object({
  returnUrl: z.string().url('Invalid return URL'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = createPortalSessionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { returnUrl } = validationResult.data

    // Get authenticated user
    const supabase = await createClient()
    const db = new DatabaseService(supabase)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user with subscription
    let userData
    try {
      userData = await db.getUserWithSubscription(user.id)
    } catch (error) {
      console.error('Failed to get user data:', error)
      return NextResponse.json(
        { error: 'Failed to get user data' },
        { status: 500 }
      )
    }

    if (!userData.user.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 400 }
      )
    }

    // Create Stripe portal session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: userData.user.stripe_customer_id!,
        return_url: returnUrl,
      })

      return NextResponse.json({
        url: session.url,
        status: 'success',
      })
    } catch (error) {
      console.error('Failed to create portal session:', error)
      return NextResponse.json(
        { error: 'Failed to create portal session' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Portal session creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
