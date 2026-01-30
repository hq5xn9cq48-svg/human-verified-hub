import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * DEBUG ENDPOINT - Force Pro activation directly via SQL
 * POST /api/debug/force-pro
 * Body: { "email": "user@example.com" }
 */
export async function POST(request: NextRequest) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const body = await request.json()
  const { email } = body
  
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  try {
    console.log('[FORCE-PRO] Starting for:', normalizedEmail)

    // Step 1: Find user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 1000
    })

    if (authError) {
      return NextResponse.json({ error: 'Auth error', details: authError.message }, { status: 500 })
    }

    const authUser = authData.users.find(u => u.email?.toLowerCase().trim() === normalizedEmail)
    
    if (!authUser) {
      return NextResponse.json({ 
        error: 'User not found in auth', 
        email: normalizedEmail,
        totalUsers: authData.users.length 
      }, { status: 404 })
    }

    console.log('[FORCE-PRO] Found auth user:', authUser.id)

    // Step 2: Check current profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    console.log('[FORCE-PRO] Current profile:', currentProfile, 'Error:', profileError?.message)

    // Step 3: Update directly
    const updateData = {
      is_pro: true,
      subscription_id: `manual_${Date.now()}`,
      customer_id: `manual_customer_${Date.now()}`,
      subscription_status: 'active'
    }

    console.log('[FORCE-PRO] Attempting update with:', updateData)

    const { data: updateResult, error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', authUser.id)
      .select()

    console.log('[FORCE-PRO] Update result:', updateResult, 'Error:', updateError?.message)

    if (updateError) {
      // Try insert if update fails
      console.log('[FORCE-PRO] Update failed, trying insert...')
      
      const { data: insertResult, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.id,
          email: normalizedEmail,
          ...updateData
        })
        .select()

      console.log('[FORCE-PRO] Insert result:', insertResult, 'Error:', insertError?.message)

      if (insertError) {
        return NextResponse.json({ 
          error: 'Both update and insert failed',
          updateError: updateError.message,
          insertError: insertError.message,
          userId: authUser.id
        }, { status: 500 })
      }
    }

    // Step 4: Verify
    const { data: finalProfile, error: verifyError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    console.log('[FORCE-PRO] Final profile:', finalProfile, 'Error:', verifyError?.message)

    return NextResponse.json({
      success: finalProfile?.is_pro === true,
      userId: authUser.id,
      email: normalizedEmail,
      before: currentProfile,
      after: finalProfile,
      updateResult,
      message: finalProfile?.is_pro === true 
        ? '✅ Pro activated successfully!' 
        : '❌ Pro activation may have failed - check after profile'
    })

  } catch (err: any) {
    console.error('[FORCE-PRO] Exception:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
