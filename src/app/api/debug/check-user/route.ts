import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isServerSupabaseConfigured } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * DEBUG ENDPOINT - Check if a user exists in the system
 * GET /api/debug/check-user?email=user@example.com
 * 
 * This helps diagnose why Pro activation might fail
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  
  if (!email) {
    return NextResponse.json({ 
      error: 'Email parameter is required',
      usage: '/api/debug/check-user?email=user@example.com'
    }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check environment
  const envStatus = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    isConfigured: isServerSupabaseConfigured()
  }

  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({
      error: 'Supabase not configured',
      envStatus
    }, { status: 500 })
  }

  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json({
      error: 'Could not create Supabase client',
      envStatus
    }, { status: 500 })
  }

  const results: Record<string, unknown> = {
    searchEmail: normalizedEmail,
    envStatus,
    timestamp: new Date().toISOString()
  }

  try {
    // 1. Check auth.users via Admin API
    console.log('[DEBUG] Checking auth.users for:', normalizedEmail)
    
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        perPage: 1000
      })
      
      if (authError) {
        results.authUsers = { error: authError.message }
      } else if (authData?.users) {
        results.totalAuthUsers = authData.users.length
        
        // Find exact match
        const exactMatch = authData.users.find(u => 
          u.email?.toLowerCase().trim() === normalizedEmail
        )
        
        if (exactMatch) {
          results.authUserFound = {
            id: exactMatch.id,
            email: exactMatch.email,
            created_at: exactMatch.created_at,
            email_confirmed_at: exactMatch.email_confirmed_at,
            last_sign_in_at: exactMatch.last_sign_in_at
          }
        } else {
          results.authUserFound = null
          
          // Look for similar emails
          const similarUsers = authData.users
            .filter(u => u.email?.toLowerCase().includes(normalizedEmail.split('@')[0]))
            .map(u => ({
              email: u.email,
              id: u.id.substring(0, 8) + '...'
            }))
          
          if (similarUsers.length > 0) {
            results.similarAuthUsers = similarUsers
          }
        }
        
        // List all emails (masked for privacy)
        results.allAuthEmails = authData.users.map(u => 
          u.email ? `${u.email.substring(0, 3)}***@${u.email.split('@')[1]}` : 'no-email'
        )
      }
    } catch (adminErr: any) {
      results.authUsers = { error: adminErr.message, type: 'exception' }
    }

    // 2. Check user_profiles table
    console.log('[DEBUG] Checking user_profiles for:', normalizedEmail)
    
    // First try by email
    let { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .ilike('email', normalizedEmail)
    
    // If not found by email, try by user ID from auth
    if ((!profiles || profiles.length === 0) && results.authUserFound) {
      const authId = (results.authUserFound as { id: string }).id
      const { data: profileById, error: profileByIdError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authId)
        .single()
      
      if (!profileByIdError && profileById) {
        profiles = [profileById]
        console.log('[DEBUG] Found profile by auth ID:', authId)
      }
    }
    
    if (profileError) {
      results.userProfiles = { error: profileError.message }
    } else if (profiles && profiles.length > 0) {
      results.userProfileFound = profiles[0]
    } else {
      results.userProfileFound = null
      
      // List all profile emails
      const { data: allProfiles } = await supabase
        .from('user_profiles')
        .select('id, email, is_pro')
        .limit(20)
      
      if (allProfiles) {
        results.allProfileEmails = allProfiles.map(p => ({
          email: p.email ? `${p.email.substring(0, 3)}***@${p.email.split('@')[1] || 'unknown'}` : 'no-email',
          is_pro: p.is_pro,
          id: p.id.substring(0, 8) + '...'
        }))
      }
    }

    // 3. Check pending_pro_activations
    console.log('[DEBUG] Checking pending_pro_activations for:', normalizedEmail)
    
    try {
      const { data: pending, error: pendingError } = await supabase
        .from('pending_pro_activations')
        .select('*')
        .ilike('email', normalizedEmail)
      
      if (pendingError) {
        results.pendingActivation = { error: pendingError.message }
      } else {
        results.pendingActivation = pending && pending.length > 0 ? pending[0] : null
      }
    } catch (pendingErr: any) {
      results.pendingActivation = { error: pendingErr.message, note: 'Table may not exist' }
    }

    // Summary
    results.summary = {
      userExistsInAuth: !!results.authUserFound,
      userHasProfile: !!results.userProfileFound,
      hasPendingActivation: !!results.pendingActivation && !('error' in (results.pendingActivation as object)),
      canActivatePro: !!results.authUserFound,
      recommendation: !results.authUserFound 
        ? 'User must sign up with this email first before Pro can be activated'
        : results.userProfileFound 
          ? 'User exists and has profile - can update to Pro directly'
          : 'User exists in auth but no profile - will create profile on Pro activation'
    }

    return NextResponse.json(results)

  } catch (err: any) {
    console.error('[DEBUG] Check user error:', err)
    return NextResponse.json({
      error: err.message,
      envStatus,
      results
    }, { status: 500 })
  }
}
