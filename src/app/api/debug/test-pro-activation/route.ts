import { NextRequest, NextResponse } from 'next/server'
import { updateUserToPro } from '@/lib/freemium'
import { isServerSupabaseConfigured } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * DEBUG ENDPOINT - Test Pro activation manually
 * POST /api/debug/test-pro-activation
 * Body: { "email": "user@example.com" }
 * 
 * This endpoint helps debug Pro activation issues.
 * REMOVE IN PRODUCTION or add authentication!
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email } = body
  
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Check environment
  const envCheck = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    isConfigured: isServerSupabaseConfigured()
  }

  console.log('[DEBUG] Starting Pro activation test for:', email)
  console.log('[DEBUG] Environment:', envCheck)

  try {
    const result = await updateUserToPro(
      null,
      email,
      `test_subscription_${Date.now()}`,
      `test_customer_${Date.now()}`
    )

    return NextResponse.json({
      success: result,
      email,
      envCheck,
      message: result 
        ? 'Pro activation successful! Check user_profiles table.' 
        : 'Pro activation failed. Check server logs for details.',
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('[DEBUG] Pro activation error:', err)
    return NextResponse.json({
      success: false,
      error: err.message,
      envCheck
    }, { status: 500 })
  }
}
