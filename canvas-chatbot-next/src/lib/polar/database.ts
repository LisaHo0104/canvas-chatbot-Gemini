// Polar database service - uses dev schema
// All tables are in dev schema to match existing application pattern

export interface User {
  id: string
  email: string
  polar_customer_id?: string
  polar_customer_external_id?: string
  subscription_status: string
  current_plan_id?: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  polar_subscription_id: string
  polar_product_id: string
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
  polar_payment_id?: string
  polar_order_id?: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export class DatabaseService {
  private supabase

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
    // Supabase client automatically uses NEXT_PUBLIC_SUPABASE_SCHEMA env var
    // No need to hardcode schema prefix
  }

  private getTableName(table: string): string {
    // Return table name without schema prefix
    // Supabase client will use the schema from NEXT_PUBLIC_SUPABASE_SCHEMA env var
    return table
  }

  async ensureUserRecord(userId: string, email: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.getTableName('users'))
      .upsert({ id: userId, email }, { onConflict: 'id' })
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to ensure user record: ${error.message}`)
    }
  }

  async createUser(email: string, polarCustomerId?: string, polarCustomerExternalId?: string): Promise<User> {
    const { data, error } = await this.supabase
      .from(this.getTableName('users'))
      .insert([{ 
        email, 
        polar_customer_id: polarCustomerId,
        polar_customer_external_id: polarCustomerExternalId 
      }])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`)
    }

    return data
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from(this.getTableName('users'))
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
      .from(this.getTableName('users'))
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user: ${error.message}`)
    }

    return data
  }

  /**
   * Ensures a user exists in dev.users table, creating if missing
   * Tries to get email from dev.profiles table or uses provided email
   */
  async ensureUserExists(userId: string, email?: string): Promise<User> {
    // Check if user already exists
    const existing = await this.getUserById(userId)
    if (existing) {
      return existing
    }

    // If email not provided, try to get it from profiles table
    let userEmail = email
    if (!userEmail) {
      // Try to get email from profiles table
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single()
      
      if (!profileError && profile?.email) {
        userEmail = profile.email
      }
    }

    if (!userEmail) {
      throw new Error(`Cannot create user ${userId}: email not found in profiles table, and not provided`)
    }

    // Create user record
    // Note: userId must exist in auth.users first (foreign key constraint)
    const { data, error } = await this.supabase
      .from(this.getTableName('users'))
      .insert([{ 
        id: userId,
        email: userEmail,
        subscription_status: 'inactive'
      }])
      .select()
      .single()

    if (error) {
      // Provide more detailed error message
      if (error.code === '23503') {
        throw new Error(`Failed to create user ${userId}: User does not exist in auth.users. The user must sign up first before webhook can create their record. Error: ${error.message}`)
      }
      if (error.code === '23505') {
        // User already exists, try to fetch it
        const existing = await this.getUserById(userId)
        if (existing) {
          return existing
        }
      }
      throw new Error(`Failed to create user: ${error.message} (code: ${error.code || 'unknown'})`)
    }

    return data
  }

  // Note: Customer mapping methods removed - use createOrRetrieveCustomer from @/lib/supabase/admin instead

  async updateUserSubscriptionStatus(userId: string, status: string, planId?: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.getTableName('users'))
      .update({ 
        subscription_status: status, 
        current_plan_id: planId,
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)

    if (error) {
      console.error('[DatabaseService] Failed to update user subscription status:', {
        error: error.message,
        code: error.code,
        userId,
        status,
        planId
      })
      throw new Error(`Failed to update user subscription status: ${error.message} (code: ${error.code || 'unknown'})`)
    }
  }

  async createSubscription(
    userId: string,
    polarSubscriptionId: string,
    polarProductId: string,
    status: string,
    currentPeriodStart?: Date,
    currentPeriodEnd?: Date
  ): Promise<Subscription> {
    // Ensure user exists before creating subscription
    await this.ensureUserExists(userId)

    const { data, error } = await this.supabase
      .from(this.getTableName('subscriptions'))
      .insert([{
        user_id: userId,
        polar_subscription_id: polarSubscriptionId,
        polar_product_id: polarProductId,
        status,
        current_period_start: currentPeriodStart?.toISOString(),
        current_period_end: currentPeriodEnd?.toISOString(),
      }])
      .select()
      .single()

    if (error) {
      // Provide more detailed error information
      const errorDetails = {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
        polarSubscriptionId,
        polarProductId
      }
      console.error('[DatabaseService] Failed to create subscription:', errorDetails)
      throw new Error(`Failed to create subscription: ${error.message} (code: ${error.code || 'unknown'})`)
    }

    return data
  }

  async getSubscriptionByPolarId(polarSubscriptionId: string): Promise<Subscription | null> {
    const { data, error } = await this.supabase
      .from(this.getTableName('subscriptions'))
      .select('*')
      .eq('polar_subscription_id', polarSubscriptionId)
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
      .from(this.getTableName('subscriptions'))
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
    polarPaymentId?: string,
    subscriptionId?: string,
    polarOrderId?: string
  ): Promise<Payment> {
    const { data, error } = await this.supabase
      .from(this.getTableName('payments'))
      .insert([{
        user_id: userId,
        subscription_id: subscriptionId,
        polar_payment_id: polarPaymentId,
        polar_order_id: polarOrderId,
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
      .from(this.getTableName('payments'))
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
      .from(this.getTableName('users'))
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      throw new Error(`Failed to get user: ${userError.message}`)
    }

    const { data: subscription, error: subError } = await this.supabase
      .from(this.getTableName('subscriptions'))
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

  // Note: Webhook event recording removed - handled in webhook handler
  // Note: Customer creation methods removed - use createOrRetrieveCustomer from @/lib/supabase/admin instead
}

