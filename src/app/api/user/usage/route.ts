export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUsageStatus } from '@/lib/freemium'
import { createServerClient, isServerSupabaseConfigured } from '@/lib/supabase/server'

// Create Supabase client for auth verification
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Check and fix subscription status on each request
 * This ensures expired subscriptions are downgraded and inconsistent states are fixed
 */
async function checkAndFixSubscription(userId: string): Promise<void> {
  if (!isServerSupabaseConfigured()) return
  
  const supabase = createServerClient()
  if (!supabase) return

  try {
    // Get user profile - only select columns that exist
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, is_pro, plan, subscription_status')
      .eq('id', userId)
      .single()

    if (error || !profile) return

    const now = new Date()
    let needsUpdate = false
    const updates: Record<string, unknown> = { updated_at: now.toISOString() }

    // Check 1: Fix inconsistent is_pro and plan
    if (profile.is_pro && profile.plan !== 'pro') {
      console.log(`[USAGE-FIX] Fixing inconsistent plan for user ${userId}: is_pro=true but plan=${profile.plan}`)
      updates.plan = 'pro'
      needsUpdate = true
    }

    // Check 2: If not Pro but plan is 'pro', fix it
    if (!profile.is_pro && profile.plan === 'pro') {
      console.log(`[USAGE-FIX] Fixing inconsistent plan for user ${userId}: is_pro=false but plan=pro`)
      updates.plan = 'free'
      needsUpdate = true
    }

    // Apply updates if needed
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)

      if (updateError) {
        console.error(`[USAGE-FIX] Error updating user ${userId}:`, updateError.message)
      } else {
        console.log(`[USAGE-FIX] Successfully fixed user ${userId}`)
      }
    }
  } catch (err) {
    console.error('[USAGE-FIX] Exception:', err)
  }
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get('force') === 'true'
  
  console.log('[USER-USAGE] ======== USAGE REQUEST ========')
  console.log('[USER-USAGE] Force refresh:', forceRefresh)
  
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[USER-USAGE] No auth header - returning guest status')
      return NextResponse.json({
        isPro: false,
        remaining: 2,
        usedToday: 0,
        limit: 2,
        isGuest: true,
        message: 'Sign in to track usage'
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify user with Supabase
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({
        isPro: false,
        remaining: 2,
        usedToday: 0,
        limit: 2,
        message: 'Database not configured'
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({
        isPro: false,
        remaining: 2,
        usedToday: 0,
        limit: 2,
        isGuest: true,
        message: 'Sign in to track usage'
      })
    }

    console.log(`[USER-USAGE] Authenticated user: ${user.id} (${user.email})`)
    
    // Check and fix subscription status on each request
    await checkAndFixSubscription(user.id)

    // Get usage status for authenticated user (will reflect any fixes made above)
    const status = await getUsageStatus(user.id)

    console.log(`[USER-USAGE] Initial status from getUsageStatus - isPro: ${status.isPro}`)

    // ALWAYS fetch profile directly for most accurate Pro status
    let plan: string = 'free'
    let directIsPro = false
    let subscriptionStatus: string | null = null
    let usedToday = status.usedToday
    let remaining = status.remaining
    let dailyUsageCount = 0
    
    if (isServerSupabaseConfigured()) {
      const serverSupabase = createServerClient()
      if (serverSupabase) {
        const { data: profile, error: profileError } = await serverSupabase
          .from('user_profiles')
          .select('is_pro, plan, subscription_status, daily_usage_count, last_usage_timestamp')
          .eq('id', user.id)
          .single()
        
        if (profile && !profileError) {
          plan = profile.plan || 'free'
          directIsPro = profile.is_pro || false
          subscriptionStatus = profile.subscription_status
          dailyUsageCount = profile.daily_usage_count || 0
          
          // Use database values directly for usage
          usedToday = dailyUsageCount
          remaining = directIsPro ? -1 : Math.max(0, 2 - dailyUsageCount)
          
          console.log(`[USER-USAGE] Direct DB check:`)
          console.log(`  - is_pro: ${directIsPro}`)
          console.log(`  - plan: ${plan}`)
          console.log(`  - subscription_status: ${subscriptionStatus}`)
          console.log(`  - daily_usage_count: ${dailyUsageCount}`)
        } else {
          console.log(`[USER-USAGE] No profile found for user - will use defaults`)
        }
      }
    }

    // Use direct DB value (most reliable)
    const finalIsPro = directIsPro

    console.log(`[USER-USAGE] Final response:`)
    console.log(`  - isPro: ${finalIsPro}`)
    console.log(`  - plan: ${plan}`)
    console.log(`  - usedToday: ${usedToday}`)
    console.log(`  - remaining: ${remaining}`)

    return NextResponse.json({
      ...status,
      isPro: finalIsPro,
      plan,
      usedToday: usedToday,
      remaining: finalIsPro ? -1 : remaining,
      limit: finalIsPro ? -1 : 2,
      isGuest: false,
      userId: user.id,
      subscriptionStatus
    })

  } catch (err) {
    console.error('[USER-USAGE] Error:', err)
    return NextResponse.json({
      isPro: false,
      remaining: 2,
      usedToday: 0,
      limit: 2,
      message: 'Error fetching usage status'
    })
  }
}

export const runtime = 'nodejs'
