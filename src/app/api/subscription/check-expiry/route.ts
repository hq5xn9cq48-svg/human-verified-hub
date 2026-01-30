export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { createServerClient, isServerSupabaseConfigured } from '@/lib/supabase/server'

/**
 * API to check and expire subscriptions that have passed their end date
 * This should be called periodically (e.g., via cron job) or on user login
 */
export async function GET() {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Cannot create Supabase client' }, { status: 500 })
  }

  try {
    const now = new Date().toISOString()
    
    // Find all active Pro subscriptions that have expired
    const { data: expiredProfiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, subscription_id, subscription_ends_at')
      .eq('is_pro', true)
      .eq('subscription_status', 'active')
      .lt('subscription_ends_at', now)
      .not('subscription_ends_at', 'is', null)

    if (fetchError) {
      console.error('[CHECK-EXPIRY] Error fetching expired profiles:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    if (!expiredProfiles || expiredProfiles.length === 0) {
      return NextResponse.json({ 
        message: 'No expired subscriptions found',
        checked: true,
        expiredCount: 0
      })
    }

    console.log(`[CHECK-EXPIRY] Found ${expiredProfiles.length} expired subscriptions`)

    // Downgrade all expired subscriptions
    const expiredIds = expiredProfiles.map(p => p.id)
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        is_pro: false,
        plan: 'free',
        subscription_status: 'expired',
        updated_at: now
      })
      .in('id', expiredIds)

    if (updateError) {
      console.error('[CHECK-EXPIRY] Error downgrading profiles:', updateError)
      return NextResponse.json({ error: 'Failed to downgrade profiles' }, { status: 500 })
    }

    console.log(`[CHECK-EXPIRY] Successfully downgraded ${expiredIds.length} subscriptions`)

    return NextResponse.json({
      message: 'Expired subscriptions processed',
      checked: true,
      expiredCount: expiredIds.length,
      expiredEmails: expiredProfiles.map(p => p.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3'))
    })

  } catch (err) {
    console.error('[CHECK-EXPIRY] Exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
