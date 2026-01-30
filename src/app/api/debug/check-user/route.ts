import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isServerSupabaseConfigured } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * DEBUG ENDPOINT - Check user profile status
 * GET /api/debug/check-user?email=user@example.com
 * 
 * This endpoint helps debug Pro activation and usage tracking issues.
 * REMOVE IN PRODUCTION or add authentication!
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  const userId = request.nextUrl.searchParams.get('userId')
  
  if (!email && !userId) {
    return NextResponse.json({ error: 'Provide email or userId parameter' }, { status: 400 })
  }

  // Check environment
  const envCheck = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    isConfigured: isServerSupabaseConfigured()
  }

  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({
      error: 'Supabase not configured',
      envCheck
    }, { status: 500 })
  }

  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json({
      error: 'Could not create Supabase client',
      envCheck
    }, { status: 500 })
  }

  try {
    // Find user in auth.users
    let authUser = null
    if (email) {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      authUser = authData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    }

    // Find user profile
    let query = supabase.from('user_profiles').select('*')
    if (userId) {
      query = query.eq('id', userId)
    } else if (email) {
      query = query.ilike('email', email)
    }
    
    const { data: profiles, error: profileError } = await query

    // Check pending activations
    let pendingActivation = null
    if (email) {
      try {
        const { data } = await supabase
          .from('pending_pro_activations')
          .select('*')
          .ilike('email', email)
          .single()
        pendingActivation = data
      } catch {
        // Table may not exist
      }
    }

    return NextResponse.json({
      envCheck,
      searchedFor: { email, userId },
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        email_confirmed_at: authUser.email_confirmed_at
      } : null,
      profiles: profiles || [],
      profileError: profileError?.message || null,
      pendingActivation,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      envCheck
    }, { status: 500 })
  }
}
