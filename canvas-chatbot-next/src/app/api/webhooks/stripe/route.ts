import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { DatabaseService } from '@/lib/stripe/database'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    const supabase = await (await import('@/lib/supabase/server')).createClient()
    const db = new DatabaseService(supabase)
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    const recorded = await db.recordWebhookEvent(event.id, event.type, JSON.parse(body))
    if (!recorded) {
      return NextResponse.json({ received: true })
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session, db)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription, db)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription, db)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, db)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice, db)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice, db)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    try {
      const supabase = await (await import('@/lib/supabase/server')).createClient()
      const db = new DatabaseService(supabase)
      await db.markWebhookProcessed(event.id)
    } catch {}
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, databaseService: DatabaseService) {
  const userId = session.metadata?.userId
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!userId) {
    console.error('No userId in session metadata')
    return
  }

  try {
    // Update user with Stripe customer ID if not already set
    const user = await databaseService.getUserById(userId)
    if (user && !user.stripe_customer_id) {
      await databaseService.updateUserStripeCustomerId(userId, customerId)
    }

    console.log(`Checkout session completed for user ${userId}`)
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
    throw error
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription, databaseService: DatabaseService) {
  const userId = subscription.metadata?.userId
  const customerId = subscription.customer as string

  if (!userId) {
    console.error('No userId in subscription metadata')
    return
  }

  try {
    const priceId = subscription.items.data[0]?.price.id
    if (!priceId) {
      throw new Error('No price ID in subscription')
    }

    await databaseService.createSubscription(
      userId,
      subscription.id,
      priceId,
      subscription.status,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000)
    )

    // Update user subscription status
    await databaseService.updateUserSubscriptionStatus(userId, 'active', priceId)

    console.log(`Subscription created for user ${userId}`)
  } catch (error) {
    console.error('Error handling subscription created:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, databaseService: DatabaseService) {
  const existingSubscription = await databaseService.getSubscriptionByStripeId(subscription.id)
  
  if (!existingSubscription) {
    console.log(`Subscription ${subscription.id} not found in database, creating...`)
    return handleSubscriptionCreated(subscription, databaseService)
  }

  try {
    const priceId = subscription.items.data[0]?.price.id
    
    await databaseService.updateSubscription(existingSubscription.id, {
      status: subscription.status,
      stripe_price_id: priceId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })

    // Update user subscription status
    const userId = existingSubscription.user_id
    const newStatus = subscription.status === 'active' ? 'active' : 'inactive'
    await databaseService.updateUserSubscriptionStatus(userId, newStatus, priceId)

    console.log(`Subscription updated for user ${userId}`)
  } catch (error) {
    console.error('Error handling subscription updated:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, databaseService: DatabaseService) {
  const existingSubscription = await databaseService.getSubscriptionByStripeId(subscription.id)
  
  if (!existingSubscription) {
    console.log(`Subscription ${subscription.id} not found in database`)
    return
  }

  try {
    await databaseService.updateSubscription(existingSubscription.id, {
      status: 'canceled',
    })

    // Update user subscription status
    const userId = existingSubscription.user_id
    await databaseService.updateUserSubscriptionStatus(userId, 'inactive')

    console.log(`Subscription deleted for user ${userId}`)
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
    throw error
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, databaseService: DatabaseService) {
  const subscriptionId = invoice.subscription as string
  const customerId = invoice.customer as string

  if (!subscriptionId) {
    console.log('No subscription ID in invoice')
    return
  }

  try {
    const subscription = await databaseService.getSubscriptionByStripeId(subscriptionId)
    if (!subscription) {
      console.log(`Subscription ${subscriptionId} not found in database`)
      return
    }

    // Create payment record
    await databaseService.createPayment(
      subscription.user_id,
      (invoice.amount_paid / 100), // Convert from cents
      invoice.currency,
      'succeeded',
      undefined, // payment_intent_id
      subscription.id,
      invoice.id
    )

    console.log(`Payment succeeded for subscription ${subscriptionId}`)
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error)
    throw error
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, databaseService: DatabaseService) {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    console.log('No subscription ID in invoice')
    return
  }

  try {
    const subscription = await databaseService.getSubscriptionByStripeId(subscriptionId)
    if (!subscription) {
      console.log(`Subscription ${subscriptionId} not found in database`)
      return
    }

    // Create failed payment record
    await databaseService.createPayment(
      subscription.user_id,
      (invoice.amount_due / 100), // Convert from cents
      invoice.currency,
      'failed',
      undefined, // payment_intent_id
      subscription.id,
      invoice.id
    )

    console.log(`Payment failed for subscription ${subscriptionId}`)
  } catch (error) {
    console.error('Error handling invoice payment failed:', error)
    throw error
  }
}
 
