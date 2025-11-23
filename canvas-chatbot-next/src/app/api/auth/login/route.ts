import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const json = NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
      supabaseResponse.cookies.getAll().forEach((cookie) =>
        json.cookies.set(cookie.name, cookie.value, cookie)
      )
      return json
    }

    // Get user profile data from profiles table
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.user.id)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
    }

    const json = NextResponse.json({
      success: true,
      message: `Welcome back, ${userData?.full_name || data.user.email}!`,
      user: {
        id: data.user.id,
        email: data.user.email,
        user_name: userData?.full_name,
      },
    })
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      json.cookies.set(cookie.name, cookie.value, cookie)
    )
    return json
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}