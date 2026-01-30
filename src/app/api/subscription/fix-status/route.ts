export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isServerSupabaseConfigured } from '@/lib/supabase/server'

/**
 * API to fix inconsistent user subscription status
 * This fixes cases where is_pro=true but plan='free'
 */
export async function POST(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Cannot create Supabase client' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { email, userId } = body

    // If specific user provided, fix just that user
    if (email || userId) {
      const query = supabase
        .from('user_profiles')
        .select('id, email, is_pro, plan, subscription_status')
      
      if (userId) {
        query.eq('id', userId)
      } else if (email) {
        query.ilike('email', email.toLowerCase().trim())
      }

      const { data: profile, error: fetchError } = await query.single()

      if (fetchError || !profile) {
        return NextResponse.json({ 
          error: 'User not found',
          details: fetchError?.message 
        }, { status: 404 })
      }

      // Check if fix needed
      if (profile.is_pro && profile.plan !== 'pro') {
        // Fix the inconsistency
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            plan: 'pro',
            subscription_status: profile.subscription_status || 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)

        if (updateError) {
          return NextResponse.json({ 
            error: 'Failed to update user',
            details: updateError.message 
          }, { status: 500 })
        }

        return NextResponse.json({
          message: 'User status fixed successfully',
          fixed: true,
          user: {
            id: profile.id,
            email: profile.email,
            previousPlan: profile.plan,
            newPlan: 'pro'
          }
        })
      }

      return NextResponse.json({
        message: 'No fix needed - user status is consistent',
        fixed: false,
        user: {
          id: profile.id,
          email: profile.email,
          is_pro: profile.is_pro,
          plan: profile.plan
        }
      })
    }

    // Fix all inconsistent users
    const { data: inconsistentProfiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, is_pro, plan')
      .eq('is_pro', true)
      .neq('plan', 'pro')

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch profiles',
        details: fetchError.message 
      }, { status: 500 })
    }

    if (!inconsistentProfiles || inconsistentProfiles.length === 0) {
      return NextResponse.json({
        message: 'No inconsistent profiles found',
        fixed: false,
        count: 0
      })
    }

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
      return NextResponse.json({ 
        error: 'Failed to update profiles',
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: `Fixed ${idsToFix.length} inconsistent profiles`,
      fixed: true,
      count: idsToFix.length,
      fixedEmails: inconsistentProfiles.map(p => p.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3'))
    })

  } catch (err) {
    console.error('[FIX-STATUS] Exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Also allow GET to check status without fixing
export async function GET(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Cannot create Supabase client' }, { status: 500 })
  }

  try {
    // Count inconsistent profiles
    const { data: inconsistentProfiles, error } = await supabase
      .from('user_profiles')
      .select('id, email, is_pro, plan, subscription_status')
      .eq('is_pro', true)
      .neq('plan', 'pro')

    if (error) {
      return NextResponse.json({ error: 'Failed to check profiles' }, { status: 500 })
    }

    return NextResponse.json({
      inconsistentCount: inconsistentProfiles?.length || 0,
      profiles: inconsistentProfiles?.map(p => ({
        id: p.id,
        email: p.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        is_pro: p.is_pro,
        plan: p.plan,
        subscription_status: p.subscription_status
      }))
    })

  } catch (err) {
    console.error('[FIX-STATUS] Exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
