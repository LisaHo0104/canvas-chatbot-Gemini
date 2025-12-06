import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'
import { CanvasAPIService } from '@/lib/canvas-api'

export async function POST(request: NextRequest) {
  try {
    const { email, password, canvas_token, canvas_url } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
      {
        db: {
          schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public',
        },
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

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    let canvasUser: any = null
    if (canvas_token && canvas_url) {
      const canvasService = new CanvasAPIService(canvas_token, canvas_url)
      try {
        canvasUser = await canvasService.getCurrentUser()
      } catch (error) {
        // If Canvas verification fails at signup, skip storing Canvas; user can connect later
        canvasUser = null
      }
    }

    // Encrypt and store Canvas credentials
    const encryptedToken = canvas_token ? encrypt(canvas_token) : null

    // Update user profile with Canvas information
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }
    if (encryptedToken && canvas_url && canvasUser) {
      updatePayload.canvas_api_key_encrypted = encryptedToken
      updatePayload.canvas_api_url = canvas_url
      updatePayload.canvas_institution = canvas_url.replace('/api/v1', '')
      updatePayload.full_name = canvasUser.name
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: authData.user.id, email, ...updatePayload }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error updating user profile:', profileError)
      // Don't fail the signup, but log the error
    }

    const json = NextResponse.json({
      success: true,
      message: canvasUser ? `Welcome, ${canvasUser.name}!` : 'Signup successful!',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        user_name: canvasUser?.name,
      },
    })
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      json.cookies.set(cookie.name, cookie.value, cookie)
    )
    return json
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
