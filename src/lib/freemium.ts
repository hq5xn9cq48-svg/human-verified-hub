/**
 * Freemium System Utilities
 * Handles usage limits for free users and Pro access
 */

import { createServerClient, isServerSupabaseConfigured } from './supabase/server'

export interface UsageStatus {
  canUse: boolean
  isPro: boolean
  remaining: number
  usedToday: number
  limit: number
  message: string
}

export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  is_pro: boolean
  subscription_id: string | null
  customer_id: string | null
  subscription_status: string | null
  daily_usage_count: number
  last_usage_date: string | null
}

const FREE_DAILY_LIMIT = 2

/**
 * Check if user can perform an analysis and increment usage if allowed
 * This is the main function called by API routes before processing
 */
export async function checkAndIncrementUsage(userId: string): Promise<UsageStatus> {
  // If Supabase not configured, allow unlimited access (dev mode)
  if (!isServerSupabaseConfigured()) {
    return {
      canUse: true,
      isPro: false,
      remaining: -1,
      usedToday: 0,
      limit: -1,
      message: 'Development mode - unlimited access'
    }
  }

  const supabase = createServerClient()
  if (!supabase) {
    return {
      canUse: true,
      isPro: false,
      remaining: -1,
      usedToday: 0,
      limit: -1,
      message: 'Database not configured'
    }
  }

  try {
    // Call the database function
    const { data, error } = await supabase.rpc('check_and_increment_usage', {
      p_user_id: userId
    })

    if (error) {
      console.error('[FREEMIUM] Error checking usage:', error)
      // On error, be permissive
      return {
        canUse: true,
        isPro: false,
        remaining: -1,
        usedToday: 0,
        limit: -1,
        message: 'Usage check failed, allowing access'
      }
    }

    return {
      canUse: data.canUse ?? true,
      isPro: data.isPro ?? false,
      remaining: data.remaining ?? -1,
      usedToday: data.usedToday ?? 0,
      limit: data.limit ?? FREE_DAILY_LIMIT,
      message: data.message ?? ''
    }
  } catch (err) {
    console.error('[FREEMIUM] Exception checking usage:', err)
    return {
      canUse: true,
      isPro: false,
      remaining: -1,
      usedToday: 0,
      limit: -1,
      message: 'Exception occurred, allowing access'
    }
  }
}

/**
 * Get user's current usage status without incrementing
 * Used for displaying remaining uses in UI
 */
export async function getUsageStatus(userId: string): Promise<UsageStatus> {
  if (!isServerSupabaseConfigured()) {
    return {
      canUse: true,
      isPro: false,
      remaining: FREE_DAILY_LIMIT,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Development mode'
    }
  }

  const supabase = createServerClient()
  if (!supabase) {
    return {
      canUse: true,
      isPro: false,
      remaining: FREE_DAILY_LIMIT,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Database not configured'
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_usage_status', {
      p_user_id: userId
    })

    if (error) {
      console.error('[FREEMIUM] Error getting status:', error)
      return {
        canUse: true,
        isPro: false,
        remaining: FREE_DAILY_LIMIT,
        usedToday: 0,
        limit: FREE_DAILY_LIMIT,
        message: 'Status check failed'
      }
    }

    return {
      canUse: (data.remaining ?? FREE_DAILY_LIMIT) > 0 || data.isPro,
      isPro: data.isPro ?? false,
      remaining: data.remaining ?? FREE_DAILY_LIMIT,
      usedToday: data.usedToday ?? 0,
      limit: data.limit ?? FREE_DAILY_LIMIT,
      message: data.isPro ? 'Unlimited Pro access' : `${data.remaining ?? FREE_DAILY_LIMIT} uses remaining today`
    }
  } catch (err) {
    console.error('[FREEMIUM] Exception getting status:', err)
    return {
      canUse: true,
      isPro: false,
      remaining: FREE_DAILY_LIMIT,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Exception occurred'
    }
  }
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isServerSupabaseConfigured()) {
    return null
  }

  const supabase = createServerClient()
  if (!supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return data as UserProfile
  } catch {
    return null
  }
}

/**
 * Update user to Pro status (called by webhook)
 */
export async function updateUserToPro(
  userId: string | null,
  email: string | null,
  subscriptionId: string,
  customerId: string
): Promise<boolean> {
  if (!isServerSupabaseConfigured()) {
    console.warn('[FREEMIUM] Cannot update Pro status - Supabase not configured')
    return false
  }

  const supabase = createServerClient()
  if (!supabase) {
    return false
  }

  try {
    // Try to find user by ID first, then by email
    let targetUserId = userId

    if (!targetUserId && email) {
      const { data: authUser } = await supabase.auth.admin.listUsers()
      const foundUser = authUser?.users?.find(u => u.email === email)
      targetUserId = foundUser?.id ?? null
    }

    if (!targetUserId) {
      console.error('[FREEMIUM] Cannot find user to update Pro status')
      return false
    }

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: targetUserId,
        is_pro: true,
        subscription_id: subscriptionId,
        customer_id: customerId,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (error) {
      console.error('[FREEMIUM] Error updating Pro status:', error)
      return false
    }

    console.log(`[FREEMIUM] User ${targetUserId} upgraded to Pro`)
    return true
  } catch (err) {
    console.error('[FREEMIUM] Exception updating Pro status:', err)
    return false
  }
}

/**
 * Downgrade user from Pro (called by webhook on cancellation)
 */
export async function downgradeUserFromPro(
  subscriptionId: string
): Promise<boolean> {
  if (!isServerSupabaseConfigured()) {
    return false
  }

  const supabase = createServerClient()
  if (!supabase) {
    return false
  }

  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_pro: false,
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscriptionId)

    if (error) {
      console.error('[FREEMIUM] Error downgrading user:', error)
      return false
    }

    console.log(`[FREEMIUM] Subscription ${subscriptionId} downgraded`)
    return true
  } catch (err) {
    console.error('[FREEMIUM] Exception downgrading user:', err)
    return false
  }
}
