import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { DatabaseService } from '@/lib/stripe/database'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
  customerEmail: z.string().email().optional(),
  metadata: z.record(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = createCheckoutSessionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { priceId, successUrl, cancelUrl, customerEmail, metadata } = validationResult.data

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

    await db.ensureUserRecord(user.id, user.email!)

    // Get or create Stripe customer
    let customerId: string
    try {
      customerId = await db.getOrCreateStripeCustomer(user.id, user.email!)
    } catch (error) {
      console.error('Failed to get or create Stripe customer:', error)
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      )
    }

    // Resolve price: allow passing a Product ID by using its default price
    let resolvedPriceId = priceId
    try {
      if (!resolvedPriceId) {
        return NextResponse.json({ error: 'Missing price ID' }, { status: 400 })
      }

      if (resolvedPriceId.startsWith('prod_')) {
        const product = await stripe.products.retrieve(resolvedPriceId)
        const defaultPrice = product.default_price
        if (!defaultPrice) {
          return NextResponse.json({ error: 'Product has no default price' }, { status: 400 })
        }
        resolvedPriceId = typeof defaultPrice === 'string' ? defaultPrice : defaultPrice.id
      }
    } catch (err) {
      console.error('Failed to resolve price ID:', err)
      return NextResponse.json({ error: 'Invalid product or price ID' }, { status: 400 })
    }

    // Create Stripe checkout session
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: resolvedPriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: user.id,
          ...metadata,
        },
        subscription_data: {
          metadata: {
            userId: user.id,
          },
        },
      })

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
        status: 'success',
      })
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      const message = error instanceof Error ? error.message : 'Failed to create checkout session'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    console.error('Checkout session creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
