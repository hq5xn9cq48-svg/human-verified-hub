import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { updateUserToPro, downgradeUserFromPro } from '@/lib/freemium'

// ============================================================================
// CONFIGURATION
// ============================================================================

// IMPORTANT: Get secret fresh from env each time (for Vercel serverless)
function getWebhookSecret(): string {
  return (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '').trim()
}

const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || ''

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

function logWebhook(event: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [LEMONSQUEEZY-WEBHOOK] ${event}`, details ? JSON.stringify(details) : '')
}

function logError(event: string, error: unknown) {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] [LEMONSQUEEZY-WEBHOOK ERROR] ${event}:`, error)
}

// ============================================================================
// SECURITY: Verify webhook signature
// LemonSqueezy uses HMAC-SHA256 with hex digest
// ============================================================================

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = getWebhookSecret()
  
  // Trim the signature to remove any whitespace
  const cleanSignature = signature.trim()
  
  // Log for debugging (only first/last chars to protect secret)
  logWebhook('Verifying signature', {
    hasSecret: !!secret,
    secretLength: secret.length,
    secretFirst4: secret.substring(0, 4),
    secretLast4: secret.substring(secret.length - 4),
    signatureLength: cleanSignature.length,
    payloadLength: payload.length,
    payloadFirst50: payload.substring(0, 50),
    payloadLast50: payload.substring(payload.length - 50)
  })

  if (!secret) {
    logError('Signature verification', 'LEMONSQUEEZY_WEBHOOK_SECRET not configured')
    return false
  }

  if (!cleanSignature) {
    logError('Signature verification', 'No signature provided in request')
    return false
  }

  try {
    // Create HMAC using the webhook secret
    const hmac = crypto.createHmac('sha256', secret)
    const digest = hmac.update(payload).digest('hex')
    
    logWebhook('Signature comparison', {
      expectedLength: digest.length,
      receivedLength: cleanSignature.length,
      expectedFirst10: digest.substring(0, 10),
      expectedLast10: digest.substring(digest.length - 10),
      receivedFirst10: cleanSignature.substring(0, 10),
      receivedLast10: cleanSignature.substring(cleanSignature.length - 10),
      match: digest === cleanSignature
    })

    // Direct string comparison first (most common case)
    if (digest === cleanSignature) {
      logWebhook('✅ Signature matched (direct comparison)')
      return true
    }
    
    // Case-insensitive comparison (hex can be upper or lower case)
    if (digest.toLowerCase() === cleanSignature.toLowerCase()) {
      logWebhook('✅ Signature matched (case-insensitive)')
      return true
    }

    // If lengths match, use timing-safe comparison
    if (digest.length === cleanSignature.length) {
      const digestBuffer = Buffer.from(digest, 'utf8')
      const signatureBuffer = Buffer.from(cleanSignature, 'utf8')
      
      const isValid = crypto.timingSafeEqual(digestBuffer, signatureBuffer)
      if (isValid) {
        logWebhook('✅ Signature matched (timing-safe comparison)')
        return true
      }
    }

    // Signature mismatch - log details for debugging
    logError('Signature mismatch', {
      expected: digest,
      received: cleanSignature,
      payloadPreview: payload.substring(0, 200)
    })
    return false

  } catch (err) {
    logError('Signature verification exception', err)
    return false
  }
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const secret = getWebhookSecret()
  
  logWebhook('========== WEBHOOK RECEIVED ==========')
  
  // Log environment check
  logWebhook('Environment check', {
    hasWebhookSecret: !!secret,
    webhookSecretLength: secret.length,
    webhookSecretPreview: secret ? 
      `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}` : 'EMPTY',
    hasStoreId: !!LEMONSQUEEZY_STORE_ID,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  try {
    // Get raw body for signature verification
    // CRITICAL: Read as text directly to preserve exact formatting
    const rawBody = await request.text()
    
    logWebhook('Raw body received', { 
      length: rawBody.length, 
      preview: rawBody.substring(0, 150) + '...',
      firstChar: rawBody.charCodeAt(0),
      lastChar: rawBody.charCodeAt(rawBody.length - 1),
      // Check for BOM or unusual characters
      hasUnusualStart: rawBody.charCodeAt(0) !== 123 // 123 is '{'
    })
    
    // Get signature from headers - LemonSqueezy uses 'X-Signature'
    const signatureHeader = request.headers.get('X-Signature') || 
                            request.headers.get('x-signature') || ''
    
    // Log all headers for debugging
    const allHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      allHeaders[key] = key.toLowerCase().includes('signature') ? value.substring(0, 20) + '...' : value.substring(0, 50)
    })
    
    logWebhook('All received headers', allHeaders)
    
    logWebhook('Received headers', {
      'X-Signature': signatureHeader ? signatureHeader.substring(0, 20) + '...' : 'null',
      'content-type': request.headers.get('content-type'),
      'x-event-name': request.headers.get('x-event-name')
    })

    // Verify signature (SECURITY CRITICAL)
    if (!verifyWebhookSignature(rawBody, signatureHeader)) {
      logError('Invalid signature - REJECTING webhook', { 
        signatureReceived: signatureHeader.substring(0, 20) + '...',
        bodyLength: rawBody.length
      })
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }
    
    logWebhook('✅ Signature verified successfully - processing webhook')

    // Parse the payload
    const payload = JSON.parse(rawBody)
    const eventName = payload.meta?.event_name
    const data = payload.data

    logWebhook('Parsed payload', { 
      event: eventName,
      dataId: data?.id,
      dataType: data?.type,
      hasAttributes: !!data?.attributes
    })

    // Log important attributes for debugging
    if (data?.attributes) {
      logWebhook('Event attributes', {
        user_email: data.attributes.user_email,
        customer_id: data.attributes.customer_id,
        status: data.attributes.status,
        store_id: data.attributes.store_id,
        variant_id: data.attributes.variant_id,
        product_id: data.attributes.product_id,
        first_order_item: data.attributes.first_order_item
      })
    }

    // Handle different webhook events
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed':
      case 'subscription_payment_success': {
        const subscriptionId = data?.id?.toString()
        const customerId = data?.attributes?.customer_id?.toString()
        const userEmail = data?.attributes?.user_email
        const status = data?.attributes?.status

        logWebhook(`Processing ${eventName}`, {
          subscriptionId,
          customerId,
          userEmail,
          status
        })

        // Activate for active/trialing subscriptions, or on payment success
        if (status === 'active' || status === 'trialing' || status === 'on_trial' || eventName === 'subscription_payment_success') {
          logWebhook('Calling updateUserToPro...', { userEmail })
          
          const success = await updateUserToPro(
            null, // userId - we'll find by email
            userEmail,
            subscriptionId || '',
            customerId || ''
          )

          logWebhook('updateUserToPro result', { success, userEmail })
          
          if (success) {
            logWebhook('✅ User upgraded to Pro successfully', { userEmail })
          } else {
            logError('❌ Failed to upgrade user', { userEmail, subscriptionId })
          }
        } else {
          logWebhook('Skipping activation - status not active', { status })
        }
        break
      }

      case 'subscription_cancelled':
      case 'subscription_expired':
      case 'subscription_paused':
      case 'subscription_payment_failed': {
        const subscriptionId = data?.id?.toString()
        const status = data?.attributes?.status
        const userEmail = data?.attributes?.user_email

        logWebhook(`Processing ${eventName}`, { subscriptionId, status, userEmail })

        // Map event to status
        const statusMap: Record<string, string> = {
          'subscription_cancelled': 'cancelled',
          'subscription_expired': 'expired',
          'subscription_paused': 'paused',
          'subscription_payment_failed': 'payment_failed'
        }

        const success = await downgradeUserFromPro(subscriptionId || '', statusMap[eventName] || 'cancelled')

        if (success) {
          logWebhook('✅ User downgraded from Pro', { subscriptionId, status: statusMap[eventName] })
        } else {
          logError('❌ Failed to downgrade user', { subscriptionId })
        }
        break
      }

      case 'order_created': {
        // Handle one-time purchases
        const orderId = data?.id?.toString()
        const orderEmail = data?.attributes?.user_email
        const orderStatus = data?.attributes?.status
        const orderCustomerId = data?.attributes?.customer_id?.toString()
        
        logWebhook('Processing order_created', {
          orderId,
          email: orderEmail,
          status: orderStatus
        })
        
        // If order is paid, upgrade user to Pro
        if (orderStatus === 'paid' && orderEmail) {
          const success = await updateUserToPro(
            null,
            orderEmail,
            `order_${orderId}`,
            orderCustomerId || `customer_${orderId}`
          )
          
          if (success) {
            logWebhook('✅ User upgraded to Pro via order', { orderEmail, orderId })
          } else {
            logError('❌ Failed to upgrade user via order', { orderEmail, orderId })
          }
        }
        break
      }

      default:
        logWebhook('Unhandled event (ignored)', { event: eventName })
    }

    logWebhook('========== WEBHOOK COMPLETE ==========')
    return NextResponse.json({ received: true, event: eventName })

  } catch (err) {
    logError('Webhook processing failed', err)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Disable body parsing since we need raw body for signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
