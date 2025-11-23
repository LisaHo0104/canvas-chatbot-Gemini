import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
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

  // IMPORTANT: Avoid writing any logic between here and supabase.auth.getUser().
  // A bug that preceeded the return statement you make here may throw a
  // NEXT_REDIRECT or a NEXT_NOT_FOUND exception, which would terminate the
  // request. This is a known bug that will be fixed in Next.js 15.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    request.nextUrl.pathname !== '/'
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like above.
  // 2. Copy the request headers to the new response. Like so:
  //    supabaseResponse.headers.set('x-my-custom-header', request.headers.get('x-my-custom-header'))
  // 3. Copy the response headers to the new response. Like so:
  //    supabaseResponse.headers.forEach((value, key) => {
  //      newResponse.headers.set(key, value)
    //    })
  // 4. Set the request cookies in the new response. Like so:
  //    newResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 5. Set the response cookies in the new response. Like so:
  //    supabaseResponse.cookies.forEach((value, key) => {
  //      newResponse.cookies.set(key, value)
  //    })
  // 6. Copy the request URL to the new response. Like so:
  //    newResponse.url = request.url

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
}