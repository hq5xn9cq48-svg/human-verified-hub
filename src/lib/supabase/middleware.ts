import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
// Note: The main analysis page is at '/', so we protect specific feature pages
const protectedRoutes = ['/humanizer', '/image-detector', '/image-to-prompt', '/history', '/dashboard']

// Placeholder values for when environment variables are missing
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Helper to check if Supabase is properly configured
function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Check if the current route is protected
  const pathname = request.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // If Supabase is not configured, skip auth checks but allow access
  if (!isSupabaseConfigured()) {
    return response
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()

    // If protected route and user not authenticated, redirect to auth page
    if (isProtectedRoute && !user) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  } catch {
    // If authentication check fails, allow access
  }

  return response
}
