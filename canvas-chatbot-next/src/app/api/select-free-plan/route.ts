import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/stripe/database'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const db = new DatabaseService(supabase)
    await db.ensureUserRecord(user.id, user.email!)
    await db.updateUserSubscriptionStatus(user.id, 'free', 'free')

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Select free plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
