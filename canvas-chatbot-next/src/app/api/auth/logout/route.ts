import { NextRequest, NextResponse } from 'next/server'
import { createAuthRouteHandlerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createAuthRouteHandlerClient(request, supabaseResponse)

    const { error } = await supabase.auth.signOut()

    if (error) {
      const json = NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
      supabaseResponse.cookies.getAll().forEach((cookie) =>
        json.cookies.set(cookie.name, cookie.value, cookie)
      )
      return json
    }

    const json = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      json.cookies.set(cookie.name, cookie.value, cookie)
    )
    return json
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
