import { stripe } from './server'

export interface User {
  id: string
  email: string
  stripe_customer_id?: string
  subscription_status: string
  current_plan_id?: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_price_id: string
  status: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  user_id: string
  subscription_id?: string
  stripe_payment_intent_id?: string
  stripe_invoice_id?: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export class DatabaseService {
  private supabase

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  async ensureUserRecord(userId: string, email: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .upsert({ id: userId, email }, { onConflict: 'id' })
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to ensure user record: ${error.message}`)
    }
  }

  async createUser(email: string, stripeCustomerId?: string): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert([{ email, stripe_customer_id: stripeCustomerId }])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`)
    }

    return data
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user: ${error.message}`)
    }

    return data
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user: ${error.message}`)
    }

    return data
  }

  async updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to update user Stripe customer ID: ${error.message}`)
    }
  }

  async updateUserSubscriptionStatus(userId: string, status: string, planId?: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ 
        subscription_status: status, 
        current_plan_id: planId,
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to update user subscription status: ${error.message}`)
    }
  }

  async createSubscription(
    userId: string,
    stripeSubscriptionId: string,
    stripePriceId: string,
    status: string,
    currentPeriodStart?: Date,
    currentPeriodEnd?: Date
  ): Promise<Subscription> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .insert([{
        user_id: userId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_price_id: stripePriceId,
        status,
        current_period_start: currentPeriodStart?.toISOString(),
        current_period_end: currentPeriodEnd?.toISOString(),
      }])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create subscription: ${error.message}`)
    }

    return data
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get subscription: ${error.message}`)
    }

    return data
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('subscriptions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`)
    }
  }

  async createPayment(
    userId: string,
    amount: number,
    currency: string,
    status: string,
    stripePaymentIntentId?: string,
    subscriptionId?: string,
    stripeInvoiceId?: string
  ): Promise<Payment> {
    const { data, error } = await this.supabase
      .from('payments')
      .insert([{
        user_id: userId,
        subscription_id: subscriptionId,
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_invoice_id: stripeInvoiceId,
        amount,
        currency,
        status,
      }])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create payment: ${error.message}`)
    }

    return data
  }

  async getPaymentsByUserId(userId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get payments: ${error.message}`)
    }

    return data || []
  }

  async getUserWithSubscription(userId: string): Promise<{
    user: User
    subscription?: Subscription
  }> {
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      throw new Error(`Failed to get user: ${userError.message}`)
    }

    const { data: subscription, error: subError } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      throw new Error(`Failed to get subscription: ${subError.message}`)
    }

    return { user, subscription }
  }

  async getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
    await this.ensureUserRecord(userId, email)
    const user = await this.getUserById(userId)
    
    if (user?.stripe_customer_id) {
      return user.stripe_customer_id
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    })

    // Update user with Stripe customer ID
    await this.updateUserStripeCustomerId(userId, customer.id)

    return customer.id
  }

  async recordWebhookEvent(eventId: string, eventType: string, payload: any): Promise<boolean> {
    const { error } = await this.supabase
      .from('webhook_events')
      .insert([{ stripe_event_id: eventId, event_type: eventType, payload, processed: false }])
    if (error) {
      if (error.code === '23505') {
        return false
      }
      throw new Error(`Failed to record webhook event: ${error.message}`)
    }
    return true
  }

  async markWebhookProcessed(eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from('webhook_events')
      .update({ processed: true })
      .eq('stripe_event_id', eventId)
    if (error) {
      throw new Error(`Failed to mark webhook processed: ${error.message}`)
    }
  }
}
