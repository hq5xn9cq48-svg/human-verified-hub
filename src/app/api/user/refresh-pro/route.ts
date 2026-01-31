export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient, isServerSupabaseConfigured } from '@/lib/supabase/server'

// Create Supabase client for auth verification
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Force refresh Pro status from database
 * This endpoint:
 * 1. Reads the user's profile directly from database
 * 2. Checks for pending activations
 * 3. Returns the current Pro status
 * 4. Optionally fixes inconsistencies
 */
export async function POST(request: NextRequest) {
  console.log('[REFRESH-PRO] ======== FORCE REFRESH PRO STATUS ========')
  
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[REFRESH-PRO] No auth header')
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        isPro: false
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify user with Supabase
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('[REFRESH-PRO] Database not configured')
      return NextResponse.json({
        success: false,
        error: 'Database not configured',
        isPro: false
      }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.log('[REFRESH-PRO] Invalid token')
      return NextResponse.json({
        success: false,
        error: 'Invalid authentication',
        isPro: false
      }, { status: 401 })
    }

    console.log(`[REFRESH-PRO] User: ${user.id} (${user.email})`)

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Server not configured',
        isPro: false
      }, { status: 500 })
    }

    const serverSupabase = createServerClient()
    if (!serverSupabase) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        isPro: false
      }, { status: 500 })
    }

    // Step 1: Check user profile
    const { data: profile, error: profileError } = await serverSupabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('[REFRESH-PRO] Profile check:', {
      found: !!profile,
      error: profileError?.message,
      is_pro: profile?.is_pro,
      plan: profile?.plan,
      subscription_status: profile?.subscription_status
    })

    // Step 2: Check for pending activations by email
    let pendingActivation = null
    if (user.email) {
      const { data: pending } = await serverSupabase
        .from('pending_pro_activations')
        .select('*')
        .ilike('email', user.email)
        .single()

      if (pending) {
        console.log('[REFRESH-PRO] Found pending activation:', {
          email: pending.email,
          subscription_id: pending.subscription_id
        })
        pendingActivation = pending
      }
    }

    // Step 3: If there's a pending activation, activate Pro
    if (pendingActivation) {
      console.log('[REFRESH-PRO] Activating Pro from pending activation')
      
      const updateData = {
        is_pro: true,
        plan: 'pro' as const,
        subscription_id: pendingActivation.subscription_id,
        customer_id: pendingActivation.customer_id,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      }

      if (profile) {
        // Update existing profile
        const { error: updateError } = await serverSupabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', user.id)

        if (updateError) {
          console.error('[REFRESH-PRO] Update error:', updateError)
        } else {
          console.log('[REFRESH-PRO] Profile updated to Pro')
        }
      } else {
        // Insert new profile
        const { error: insertError } = await serverSupabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email,
            ...updateData,
            created_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('[REFRESH-PRO] Insert error:', insertError)
        } else {
          console.log('[REFRESH-PRO] New Pro profile created')
        }
      }

      // Remove pending activation
      await serverSupabase
        .from('pending_pro_activations')
        .delete()
        .eq('email', pendingActivation.email)

      console.log('[REFRESH-PRO] Pending activation cleaned up')

      return NextResponse.json({
        success: true,
        isPro: true,
        plan: 'pro',
        message: 'Pro status activated from pending activation',
        activated: true
      })
    }

    // Step 4: Fix inconsistencies if needed
    if (profile) {
      let needsFix = false
      const fixes: Record<string, unknown> = {}

      // Fix is_pro = true but plan != 'pro'
      if (profile.is_pro && profile.plan !== 'pro') {
        console.log('[REFRESH-PRO] Fixing plan mismatch')
        fixes.plan = 'pro'
        needsFix = true
      }

      // Fix is_pro = false but plan = 'pro'
      if (!profile.is_pro && profile.plan === 'pro') {
        console.log('[REFRESH-PRO] Fixing is_pro mismatch')
        fixes.is_pro = true
        needsFix = true
      }

      if (needsFix) {
        fixes.updated_at = new Date().toISOString()
        await serverSupabase
          .from('user_profiles')
          .update(fixes)
          .eq('id', user.id)
        console.log('[REFRESH-PRO] Applied fixes:', fixes)
      }

      return NextResponse.json({
        success: true,
        isPro: profile.is_pro || fixes.is_pro === true,
        plan: profile.is_pro || fixes.is_pro === true ? 'pro' : 'free',
        subscriptionStatus: profile.subscription_status,
        fixed: needsFix
      })
    }

    // No profile found
    return NextResponse.json({
      success: true,
      isPro: false,
      plan: 'free',
      message: 'No profile found - free user'
    })

  } catch (err) {
    console.error('[REFRESH-PRO] Error:', err)
    return NextResponse.json({
      success: false,
      error: 'Server error',
      isPro: false
    }, { status: 500 })
  }
}

export const runtime = 'nodejs'
