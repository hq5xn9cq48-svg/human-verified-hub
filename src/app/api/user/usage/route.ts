export const dynamic = 'force-dynamic';

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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    // Get usage status for authenticated user
    const status = await getUsageStatus(user.id)

    return NextResponse.json({
      ...status,
      isGuest: false,
      userId: user.id
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
