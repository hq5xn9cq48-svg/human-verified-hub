import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// This endpoint helps verify webhook configuration WITHOUT exposing secrets
// Access: GET /api/debug/verify-webhook-config?test_payload=hello

export async function GET(request: NextRequest) {
  const secret = (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '').trim()
  const testPayload = request.nextUrl.searchParams.get('test_payload') || 'test'
  
  // Generate what the signature SHOULD be for a test payload
  let expectedSignature = ''
  if (secret) {
    const hmac = crypto.createHmac('sha256', secret)
    expectedSignature = hmac.update(testPayload).digest('hex')
  }
  
  return NextResponse.json({
    status: 'Webhook Configuration Check',
    timestamp: new Date().toISOString(),
    
    // Secret info (without revealing the actual secret)
    secret_configured: !!secret,
    secret_length: secret.length,
    secret_starts_with: secret ? secret.substring(0, 4) + '...' : 'NOT SET',
    secret_ends_with: secret ? '...' + secret.substring(secret.length - 4) : 'NOT SET',
    
    // Environment info
    env_vars: {
      LEMONSQUEEZY_WEBHOOK_SECRET: !!process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
      LEMONSQUEEZY_STORE_ID: process.env.LEMONSQUEEZY_STORE_ID || 'NOT SET',
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_KEY_LENGTH: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    },
    
    // Test signature (for verifying the secret works)
    test_info: {
      test_payload: testPayload,
      expected_signature_for_test: expectedSignature || 'Cannot generate - no secret',
      signature_length: expectedSignature.length || 0,
      
      // Instructions
      instructions: [
        '1. Copy your webhook secret from LemonSqueezy dashboard',
        '2. Compare the secret_starts_with and secret_ends_with with your LemonSqueezy secret',
        '3. If they don\'t match, update LEMONSQUEEZY_WEBHOOK_SECRET in Vercel',
        '4. Make sure there are no extra spaces or quotes around the secret in Vercel',
        '5. Redeploy after updating the secret'
      ]
    }
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
