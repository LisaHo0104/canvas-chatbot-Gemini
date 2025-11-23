import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

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