import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { updateUserToPro, downgradeUserFromPro } from '@/lib/freemium'

// ============================================================================
// CONFIGURATION
// ============================================================================

const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || '271076'
const LEMONSQUEEZY_VARIANT_ID = process.env.LEMONSQUEEZY_VARIANT_ID || '1207172'

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
    logError('Signature verification', 'LEMONSQUEEZY_WEBHOOK_SECRET not configured')
    return false
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
  logWebhook('Webhook received')

  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    
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

    // Parse the payload
    const payload = JSON.parse(rawBody)
    const eventName = payload.meta?.event_name
    const data = payload.data

    logWebhook('Event received', { 
      event: eventName,
      subscriptionId: data?.id,
      customerId: data?.attributes?.customer_id
    })

    // Validate store ID for additional security
    const storeId = data?.attributes?.store_id?.toString()
    if (storeId && storeId !== LEMONSQUEEZY_STORE_ID) {
      logError('Store ID mismatch', { expected: LEMONSQUEEZY_STORE_ID, received: storeId })
      return NextResponse.json(
        { error: 'Invalid store ID' },
        { status: 400 }
      )
    }

    // Handle different webhook events
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed': {
        const subscriptionId = data?.id?.toString()
        const customerId = data?.attributes?.customer_id?.toString()
        const userEmail = data?.attributes?.user_email
        const status = data?.attributes?.status

        logWebhook('Processing subscription activation', {
          subscriptionId,
          customerId,
          userEmail,
          status
        })

        // Only activate for active/trialing subscriptions
        if (status === 'active' || status === 'trialing' || status === 'on_trial') {
          const success = await updateUserToPro(
            null, // userId - we'll find by email
            userEmail,
            subscriptionId,
            customerId
          )

          if (success) {
            logWebhook('User upgraded to Pro successfully', { userEmail })
          } else {
            logError('Failed to upgrade user', { userEmail, subscriptionId })
          }
        }
        break
      }

      case 'subscription_cancelled':
      case 'subscription_expired':
      case 'subscription_paused': {
        const subscriptionId = data?.id?.toString()

        logWebhook('Processing subscription deactivation', {
          subscriptionId,
          event: eventName
        })

        const success = await downgradeUserFromPro(subscriptionId)

        if (success) {
          logWebhook('User downgraded from Pro successfully', { subscriptionId })
        } else {
          logError('Failed to downgrade user', { subscriptionId })
        }
        break
      }

      case 'subscription_payment_success': {
        logWebhook('Payment successful', { 
          subscriptionId: data?.id,
          amount: data?.attributes?.total
        })
        // Optional: Track payment for analytics
        break
      }

      case 'subscription_payment_failed': {
        logWebhook('Payment failed', { 
          subscriptionId: data?.id 
        })
        // Optional: Send notification email
        break
      }

      case 'order_created': {
        logWebhook('Order created', {
          orderId: data?.id,
          total: data?.attributes?.total,
          email: data?.attributes?.user_email
        })
        break
      }

      default:
        logWebhook('Unhandled event', { event: eventName })
    }

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
