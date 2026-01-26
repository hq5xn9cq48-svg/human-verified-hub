/**
 * Freemium System Utilities
 * Handles usage limits for free users and Pro access
 * 24-Hour Rolling Window Logic (resets 24 hours after last use, NOT at midnight)
 */

import { createServerClient, isServerSupabaseConfigured } from './supabase/server'

export interface UsageStatus {
  canUse: boolean
  isPro: boolean
  remaining: number
  usedToday: number
  limit: number
  message: string
  resetTime?: string // ISO timestamp when limit resets
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
  last_usage_timestamp: string | null // Changed from last_usage_date to timestamp for 24hr rolling
}

const FREE_DAILY_LIMIT = 2
const ROLLING_WINDOW_HOURS = 24

/**
 * Check if 24 hours have passed since the last usage timestamp
 */
function has24HoursPassed(lastUsageTimestamp: string | null): boolean {
  if (!lastUsageTimestamp) return true
  
  const lastUsage = new Date(lastUsageTimestamp)
  const now = new Date()
  const hoursSinceLastUsage = (now.getTime() - lastUsage.getTime()) / (1000 * 60 * 60)
  
  return hoursSinceLastUsage >= ROLLING_WINDOW_HOURS
}

/**
 * Get the reset time (24 hours after last usage)
 */
function getResetTime(lastUsageTimestamp: string | null): string | undefined {
  if (!lastUsageTimestamp) return undefined
  
  const lastUsage = new Date(lastUsageTimestamp)
  const resetTime = new Date(lastUsage.getTime() + ROLLING_WINDOW_HOURS * 60 * 60 * 1000)
  return resetTime.toISOString()
}

/**
 * Check if user can perform an analysis and increment usage if allowed
 * This is the main function called by API routes before processing
 * 
 * STRICT ENFORCEMENT: Uses 24-hour rolling window from last use
 */
export async function checkAndIncrementUsage(userId: string): Promise<UsageStatus> {
  // If Supabase not configured, DENY access in production mode
  if (!isServerSupabaseConfigured()) {
    console.warn('[FREEMIUM] Supabase not configured - DENYING access in strict mode')
    return {
      canUse: false,
      isPro: false,
      remaining: 0,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Service temporarily unavailable. Please try again later.'
    }
  }

  const supabase = createServerClient()
  if (!supabase) {
    console.error('[FREEMIUM] Failed to create Supabase client - DENYING access')
    return {
      canUse: false,
      isPro: false,
      remaining: 0,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Database connection failed. Please try again.'
    }
  }

  try {
    // Get current usage status
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_pro, daily_usage_count, last_usage_timestamp')
      .eq('id', userId)
      .single()

    // If user has no profile yet, create one and allow first use
    if (profileError && profileError.code === 'PGRST116') {
      const now = new Date().toISOString()
      await supabase.from('user_profiles').insert({
        id: userId,
        is_pro: false,
        daily_usage_count: 1,
        last_usage_timestamp: now
      })
      
      return {
        canUse: true,
        isPro: false,
        remaining: FREE_DAILY_LIMIT - 1,
        usedToday: 1,
        limit: FREE_DAILY_LIMIT,
        message: `${FREE_DAILY_LIMIT - 1} use remaining`,
        resetTime: getResetTime(now)
      }
    }

    if (profileError) {
      console.error('[FREEMIUM] Error fetching profile:', profileError)
      // STRICT MODE: On error, DENY access to prevent abuse
      return {
        canUse: false,
        isPro: false,
        remaining: 0,
        usedToday: 0,
        limit: FREE_DAILY_LIMIT,
        message: 'Unable to verify usage status. Please try again.'
      }
    }

    // Pro users bypass all limits
    if (profile?.is_pro) {
      return {
        canUse: true,
        isPro: true,
        remaining: -1,
        usedToday: 0,
        limit: -1,
        message: 'Unlimited Pro access'
      }
    }

    // Check if 24 hours have passed since last use (rolling window)
    const lastUsageTimestamp = profile?.last_usage_timestamp
    let currentCount = profile?.daily_usage_count ?? 0

    // Reset count if 24 hours have passed since last use
    if (has24HoursPassed(lastUsageTimestamp)) {
      currentCount = 0
    }

    // STRICT ENFORCEMENT: Block if limit reached
    if (currentCount >= FREE_DAILY_LIMIT) {
      return {
        canUse: false,
        isPro: false,
        remaining: 0,
        usedToday: currentCount,
        limit: FREE_DAILY_LIMIT,
        message: "You've used your 2 free daily analyses. Upgrade to Pro for unlimited access.",
        resetTime: getResetTime(lastUsageTimestamp)
      }
    }

    // Increment usage count and update timestamp
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        daily_usage_count: currentCount + 1,
        last_usage_timestamp: now
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[FREEMIUM] Error updating usage:', updateError)
      // Still allow this request but log the error
    }

    const newRemaining = FREE_DAILY_LIMIT - (currentCount + 1)
    
    return {
      canUse: true,
      isPro: false,
      remaining: newRemaining,
      usedToday: currentCount + 1,
      limit: FREE_DAILY_LIMIT,
      message: newRemaining > 0 
        ? `${newRemaining} ${newRemaining === 1 ? 'use' : 'uses'} remaining`
        : "You've used your 2 free daily analyses. Upgrade to Pro for unlimited access.",
      resetTime: getResetTime(now)
    }

  } catch (err) {
    console.error('[FREEMIUM] Exception checking usage:', err)
    // STRICT MODE: On exception, DENY access
    return {
      canUse: false,
      isPro: false,
      remaining: 0,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Unable to verify usage. Please try again.'
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
      canUse: false,
      isPro: false,
      remaining: 0,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Service not configured'
    }
  }

  const supabase = createServerClient()
  if (!supabase) {
    return {
      canUse: false,
      isPro: false,
      remaining: 0,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Database not configured'
    }
  }

  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('is_pro, daily_usage_count, last_usage_timestamp')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return {
        canUse: true,
        isPro: false,
        remaining: FREE_DAILY_LIMIT,
        usedToday: 0,
        limit: FREE_DAILY_LIMIT,
        message: `${FREE_DAILY_LIMIT} uses available`
      }
    }

    if (profile.is_pro) {
      return {
        canUse: true,
        isPro: true,
        remaining: -1,
        usedToday: 0,
        limit: -1,
        message: 'Unlimited Pro access'
      }
    }

    // Check 24-hour rolling window
    const lastUsageTimestamp = profile.last_usage_timestamp
    let currentCount = profile.daily_usage_count ?? 0

    if (has24HoursPassed(lastUsageTimestamp)) {
      currentCount = 0
    }

    const remaining = Math.max(0, FREE_DAILY_LIMIT - currentCount)

    return {
      canUse: remaining > 0,
      isPro: false,
      remaining,
      usedToday: currentCount,
      limit: FREE_DAILY_LIMIT,
      message: remaining > 0 
        ? `${remaining} ${remaining === 1 ? 'use' : 'uses'} remaining`
        : "Daily limit reached. Upgrade to Pro.",
      resetTime: getResetTime(lastUsageTimestamp)
    }
  } catch (err) {
    console.error('[FREEMIUM] Exception getting status:', err)
    return {
      canUse: false,
      isPro: false,
      remaining: 0,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Error checking status'
    }
  }
}

/**
 * Check if user is Pro (for feature gating)
 * Used for locking features like PDF reports, history export, etc.
 */
export async function isUserPro(userId: string): Promise<boolean> {
  if (!isServerSupabaseConfigured()) {
    return false
  }

  const supabase = createServerClient()
  if (!supabase) {
    return false
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_pro')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return data.is_pro === true
  } catch {
    return false
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
 * Supports both monthly and yearly subscriptions
 * Uses multiple strategies to find the user: by ID, by email lookup in auth, by email in profiles
 */
export async function updateUserToPro(
  userId: string | null,
  email: string | null,
  subscriptionId: string,
  customerId: string,
  variantId?: string
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
    let targetUserId = userId

    // Strategy 1: If we have a userId, use it directly
    if (targetUserId) {
      console.log(`[FREEMIUM] Using provided userId: ${targetUserId}`)
    }

    // Strategy 2: Try to find user by email in auth.users
    if (!targetUserId && email) {
      console.log(`[FREEMIUM] Looking up user by email: ${email}`)
      try {
        const { data: authUser } = await supabase.auth.admin.listUsers()
        const foundUser = authUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (foundUser) {
          targetUserId = foundUser.id
          console.log(`[FREEMIUM] Found user by email in auth: ${targetUserId}`)
        }
      } catch (adminErr) {
        console.log('[FREEMIUM] Admin API not available, trying alternative lookup')
      }
    }

    // Strategy 3: Look for existing profile with this email
    if (!targetUserId && email) {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (existingProfile?.id) {
        targetUserId = existingProfile.id
        console.log(`[FREEMIUM] Found user by email in profiles: ${targetUserId}`)
      }
    }

    // If we still can't find the user, log and return false
    if (!targetUserId) {
      console.warn(`[FREEMIUM] Pro grant pending for email: ${email}, subscription: ${subscriptionId}`)
      return false
    }

    // Update the user profile to Pro status
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: targetUserId,
        email: email?.toLowerCase(),
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

    const billingCycle = variantId?.includes('yearly') || variantId === '1207173' ? 'yearly' : 'monthly'
    console.log(`[FREEMIUM] ✅ User ${targetUserId} upgraded to Pro (${billingCycle}, variant: ${variantId || 'monthly'})`)
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
