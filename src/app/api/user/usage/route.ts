import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUsageStatus } from '@/lib/freemium'

// Create Supabase client for auth verification
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    
    // SECURITY: Guest users see a prompt to sign in - NOT fake usage data
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        isPro: false,
        remaining: 0, // Show 0 for guests - they must sign in
        usedToday: 0,
        limit: 2,
        isGuest: true,
        canUse: false,
        message: 'Sign in to get 2 free daily analyses'
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify user with Supabase
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({
        isPro: false,
        remaining: 0,
        usedToday: 0,
        limit: 2,
        canUse: false,
        message: 'Database not configured'
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({
        isPro: false,
        remaining: 0, // Invalid token = guest
        usedToday: 0,
        limit: 2,
        isGuest: true,
        canUse: false,
        message: 'Sign in to get 2 free daily analyses'
      })
    }

    // Get REAL usage status for authenticated user from database
    const status = await getUsageStatus(user.id)

    // Return accurate usage data tied to user ID
    return NextResponse.json({
      ...status,
      isGuest: false,
      userId: user.id
    })

  } catch (err) {
    console.error('[USER-USAGE] Error:', err)
    return NextResponse.json({
      isPro: false,
      remaining: 0,
      usedToday: 0,
      limit: 2,
      canUse: false,
      message: 'Error fetching usage status'
    })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
