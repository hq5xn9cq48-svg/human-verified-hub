import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { updateUserToPro, downgradeUserFromPro } from '@/lib/freemium'

// ============================================================================
// CONFIGURATION
// ============================================================================

const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''
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
// ============================================================================

function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!LEMONSQUEEZY_WEBHOOK_SECRET) {
    logError('Signature verification', 'LEMONSQUEEZY_WEBHOOK_SECRET not configured - SKIPPING VERIFICATION')
    // In development, you might want to skip verification
    // For production, you should return false here
    return true // WARNING: Change to false in production!
  }

  try {
    const hmac = crypto.createHmac('sha256', LEMONSQUEEZY_WEBHOOK_SECRET)
    const digest = hmac.update(payload).digest('hex')
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    )
  } catch (err) {
    logError('Signature verification failed', err)
    return false
  }
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  logWebhook('========== WEBHOOK RECEIVED ==========')
  
  // Log environment check
  logWebhook('Environment check', {
    hasWebhookSecret: !!LEMONSQUEEZY_WEBHOOK_SECRET,
    hasStoreId: !!LEMONSQUEEZY_STORE_ID,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
  })

  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    logWebhook('Raw body received', { length: rawBody.length })
    
    // Get signature from headers
    const signature = request.headers.get('x-signature') || 
                      request.headers.get('X-Signature') || ''

    // Verify signature (SECURITY CRITICAL)
    if (!verifyWebhookSignature(rawBody, signature)) {
      logError('Invalid signature', { receivedSignature: signature.substring(0, 10) + '...' })
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }
    logWebhook('Signature verified successfully')

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

    // Log full attributes for debugging
    if (data?.attributes) {
      logWebhook('Event attributes', {
        user_email: data.attributes.user_email,
        customer_id: data.attributes.customer_id,
        status: data.attributes.status,
        store_id: data.attributes.store_id,
        variant_id: data.attributes.variant_id,
        product_id: data.attributes.product_id
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

        // Activate for active/trialing subscriptions, or payment success
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
      case 'subscription_paused': {
        const subscriptionId = data?.id?.toString()

        logWebhook(`Processing ${eventName}`, { subscriptionId })

        const success = await downgradeUserFromPro(subscriptionId || '')

        if (success) {
          logWebhook('✅ User downgraded from Pro', { subscriptionId })
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
