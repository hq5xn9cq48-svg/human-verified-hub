import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// This endpoint lets you test if a signature is valid
// POST /api/debug/test-signature
// Body: { "payload": "raw json string", "signature": "the signature to verify" }

export async function POST(request: NextRequest) {
  const secret = (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '').trim()
  
  if (!secret) {
    return NextResponse.json({
      error: 'LEMONSQUEEZY_WEBHOOK_SECRET not configured',
      status: 'FAILED'
    }, { status: 500 })
  }
  
  try {
    const body = await request.json()
    const { payload, signature } = body
    
    if (!payload || !signature) {
      return NextResponse.json({
        error: 'Missing payload or signature',
        required: { payload: 'string', signature: 'string' }
      }, { status: 400 })
    }
    
    // Generate the expected signature
    const hmac = crypto.createHmac('sha256', secret)
    const expectedSignature = hmac.update(payload).digest('hex')
    
    // Compare
    const directMatch = expectedSignature === signature
    const caseInsensitiveMatch = expectedSignature.toLowerCase() === signature.toLowerCase()
    
    return NextResponse.json({
      status: directMatch || caseInsensitiveMatch ? 'VALID' : 'INVALID',
      details: {
        payload_length: payload.length,
        signature_length: signature.length,
        expected_signature_length: expectedSignature.length,
        direct_match: directMatch,
        case_insensitive_match: caseInsensitiveMatch,
        expected_first_10: expectedSignature.substring(0, 10),
        received_first_10: signature.substring(0, 10),
        expected_last_10: expectedSignature.substring(expectedSignature.length - 10),
        received_last_10: signature.substring(signature.length - 10)
      },
      
      // Only show in debug mode
      debug: process.env.NODE_ENV === 'development' ? {
        expected_signature: expectedSignature,
        received_signature: signature
      } : undefined
    })
    
  } catch (err) {
    return NextResponse.json({
      error: 'Invalid request',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 400 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
