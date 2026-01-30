import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Debug endpoint to test webhook signature generation
// POST /api/debug/webhook-test
// This will receive a payload just like the real webhook and show you what's happening

export async function POST(request: NextRequest) {
  const secret = (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '').trim()
  
  try {
    // Get raw body exactly as received
    const rawBody = await request.text()
    
    // Get signature from headers
    const signatureHeader = request.headers.get('X-Signature') || 
                            request.headers.get('x-signature') || ''
    
    // Log all headers
    const allHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      allHeaders[key] = value
    })
    
    // Calculate what signature we expect
    let expectedSignature = ''
    if (secret) {
      const hmac = crypto.createHmac('sha256', secret)
      expectedSignature = hmac.update(rawBody).digest('hex')
    }
    
    // Parse body to see if it's valid JSON
    let parsedBody = null
    let parseError = null
    try {
      parsedBody = JSON.parse(rawBody)
    } catch (e) {
      parseError = e instanceof Error ? e.message : 'Unknown parse error'
    }
    
    const result = {
      timestamp: new Date().toISOString(),
      
      // Secret info
      secret: {
        configured: !!secret,
        length: secret.length,
        preview: secret ? `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}` : 'NOT SET'
      },
      
      // Signature info
      signature: {
        received: signatureHeader || 'NOT PROVIDED',
        received_length: signatureHeader.length,
        expected: expectedSignature || 'CANNOT CALCULATE - NO SECRET',
        expected_length: expectedSignature.length,
        match: signatureHeader === expectedSignature,
        case_insensitive_match: signatureHeader.toLowerCase() === expectedSignature.toLowerCase()
      },
      
      // Body info
      body: {
        length: rawBody.length,
        first_100_chars: rawBody.substring(0, 100),
        last_50_chars: rawBody.substring(rawBody.length - 50),
        first_char_code: rawBody.charCodeAt(0),
        last_char_code: rawBody.charCodeAt(rawBody.length - 1),
        is_valid_json: parsedBody !== null,
        parse_error: parseError,
        event_name: parsedBody?.meta?.event_name || 'N/A'
      },
      
      // Headers
      headers: allHeaders,
      
      // Verification result
      verification: {
        would_pass: signatureHeader === expectedSignature || signatureHeader.toLowerCase() === expectedSignature.toLowerCase(),
        reason: !secret 
          ? 'SECRET NOT CONFIGURED' 
          : !signatureHeader 
            ? 'NO SIGNATURE RECEIVED' 
            : signatureHeader === expectedSignature 
              ? 'EXACT MATCH' 
              : signatureHeader.toLowerCase() === expectedSignature.toLowerCase()
                ? 'CASE INSENSITIVE MATCH'
                : 'SIGNATURE MISMATCH'
      },
      
      // Troubleshooting tips
      troubleshooting: [
        'Make sure LEMONSQUEEZY_WEBHOOK_SECRET in Vercel matches exactly what\'s in LemonSqueezy dashboard',
        'Check that there are no extra spaces, quotes, or line breaks in the secret',
        'If using test mode, make sure you\'re using the test mode webhook secret',
        'Try regenerating the webhook secret in LemonSqueezy and updating Vercel',
        'Redeploy your Vercel app after updating environment variables'
      ]
    }
    
    return NextResponse.json(result)
    
  } catch (err) {
    return NextResponse.json({
      error: 'Error processing request',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support GET for checking config
export async function GET() {
  const secret = (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '').trim()
  
  return NextResponse.json({
    status: 'Debug Webhook Test Endpoint',
    description: 'POST to this endpoint with the webhook payload to debug signature issues',
    secret: {
      configured: !!secret,
      length: secret.length,
      preview: secret ? `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}` : 'NOT SET'
    },
    instructions: [
      '1. Copy the full webhook payload from LemonSqueezy',
      '2. POST it to this endpoint with the X-Signature header',
      '3. Check the response to see if signatures match'
    ]
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
