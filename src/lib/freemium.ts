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
 * Check if user can perform an analysis (WITHOUT incrementing)
 * This checks if the user has remaining uses or is Pro
 * Call incrementUsageAfterSuccess() AFTER successful analysis
 */
export async function checkUsageBeforeAction(userId: string): Promise<UsageStatus> {
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

    // If user has no profile yet, create one (but don't count yet)
    if (profileError && profileError.code === 'PGRST116') {
      await supabase.from('user_profiles').insert({
        id: userId,
        is_pro: false,
        daily_usage_count: 0,
        last_usage_timestamp: null
      })
      
      return {
        canUse: true,
        isPro: false,
        remaining: FREE_DAILY_LIMIT,
        usedToday: 0,
        limit: FREE_DAILY_LIMIT,
        message: `${FREE_DAILY_LIMIT} uses available`
      }
    }

    if (profileError) {
      console.error('[FREEMIUM] Error fetching profile:', profileError)
      return {
        canUse: false,
        isPro: false,
        remaining: 0,
        usedToday: 0,
        limit: FREE_DAILY_LIMIT,
        message: 'Unable to verify usage status. Please try again.'
      }
    }

    // Pro users bypass all limits - UNLIMITED ACCESS
    if (profile?.is_pro) {
      console.log(`[FREEMIUM] ✅ Pro user ${userId} - UNLIMITED ACCESS`)
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
      // Reset in database and clear timestamp since window has reset
      await supabase
        .from('user_profiles')
        .update({ daily_usage_count: 0, last_usage_timestamp: null })
        .eq('id', userId)
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

    // User can proceed
    const remaining = FREE_DAILY_LIMIT - currentCount
    return {
      canUse: true,
      isPro: false,
      remaining,
      usedToday: currentCount,
      limit: FREE_DAILY_LIMIT,
      message: `${remaining} ${remaining === 1 ? 'use' : 'uses'} remaining`,
      resetTime: getResetTime(lastUsageTimestamp)
    }

  } catch (err) {
    console.error('[FREEMIUM] Exception checking usage:', err)
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
 * Increment usage AFTER successful analysis
 * Only call this when the analysis has completed successfully
 * Pro users are NOT affected (no increment)
 */
export async function incrementUsageAfterSuccess(userId: string): Promise<UsageStatus | null> {
  if (!isServerSupabaseConfigured()) {
    return null
  }

  const supabase = createServerClient()
  if (!supabase) {
    return null
  }

  try {
    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_pro, daily_usage_count, last_usage_timestamp')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[FREEMIUM] Error getting profile for increment:', profileError)
      return null
    }

    // Pro users - don't increment anything
    if (profile.is_pro) {
      console.log(`[FREEMIUM] Pro user ${userId} - no usage increment needed`)
      return {
        canUse: true,
        isPro: true,
        remaining: -1,
        usedToday: 0,
        limit: -1,
        message: 'Unlimited Pro access'
      }
    }

    // Calculate current count (with 24h reset check)
    let currentCount = profile.daily_usage_count ?? 0
    if (has24HoursPassed(profile.last_usage_timestamp)) {
      currentCount = 0
    }

    // Increment usage count
    const now = new Date().toISOString()
    const newCount = currentCount + 1
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        daily_usage_count: newCount,
        last_usage_timestamp: now
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[FREEMIUM] Error updating usage after success:', updateError)
      return null
    }

    const newRemaining = Math.max(0, FREE_DAILY_LIMIT - newCount)
    
    console.log(`[FREEMIUM] ✅ User ${userId} usage incremented: ${currentCount} -> ${newCount} (${newRemaining} remaining)`)
    
    return {
      canUse: newRemaining > 0,
      isPro: false,
      remaining: newRemaining,
      usedToday: newCount,
      limit: FREE_DAILY_LIMIT,
      message: newRemaining > 0 
        ? `${newRemaining} ${newRemaining === 1 ? 'use' : 'uses'} remaining`
        : "You've used your 2 free daily analyses. Upgrade to Pro for unlimited access.",
      resetTime: getResetTime(now)
    }

  } catch (err) {
    console.error('[FREEMIUM] Exception incrementing usage:', err)
    return null
  }
}

/**
 * Legacy function - maintained for backward compatibility
 * Now just calls checkUsageBeforeAction (no auto-increment)
 */
export async function checkAndIncrementUsage(userId: string): Promise<UsageStatus> {
  return checkUsageBeforeAction(userId)
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

    // If window has reset, don't return a resetTime (it's in the past)
    const hasReset = has24HoursPassed(lastUsageTimestamp)
    if (hasReset) {
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
      resetTime: hasReset ? undefined : getResetTime(lastUsageTimestamp)
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
