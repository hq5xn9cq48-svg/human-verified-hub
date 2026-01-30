export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { createServerClient, isServerSupabaseConfigured } from '@/lib/supabase/server'

/**
 * API to check subscription status and fix inconsistencies
 * Note: subscription_ends_at column may not exist in older DB schemas
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
    // Check for inconsistent profiles (is_pro=true but plan='free')
    const { data: inconsistentProfiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, is_pro, plan, subscription_status')
      .eq('is_pro', true)
      .neq('plan', 'pro')

    if (fetchError) {
      console.error('[CHECK-EXPIRY] Error fetching profiles:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch profiles', details: fetchError.message }, { status: 500 })
    }

    if (!inconsistentProfiles || inconsistentProfiles.length === 0) {
      return NextResponse.json({ 
        message: 'No inconsistent subscriptions found',
        checked: true,
        inconsistentCount: 0
      })
    }

    console.log(`[CHECK-EXPIRY] Found ${inconsistentProfiles.length} inconsistent profiles`)

    // Fix all inconsistent profiles
    const idsToFix = inconsistentProfiles.map(p => p.id)
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        plan: 'pro',
        updated_at: new Date().toISOString()
      })
      .in('id', idsToFix)

    if (updateError) {
      console.error('[CHECK-EXPIRY] Error fixing profiles:', updateError)
      return NextResponse.json({ error: 'Failed to fix profiles', details: updateError.message }, { status: 500 })
    }

    console.log(`[CHECK-EXPIRY] Successfully fixed ${idsToFix.length} profiles`)

    return NextResponse.json({
      message: 'Inconsistent subscriptions fixed',
      checked: true,
      fixedCount: idsToFix.length,
      fixedEmails: inconsistentProfiles.map(p => p.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3'))
    })

  } catch (err) {
    console.error('[CHECK-EXPIRY] Exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
