/**
 * Freemium System Utilities
 * Handles usage limits for free users and Pro access
 * 
 * PRODUCTION RULES:
 * - Free users get exactly 2 uses per 24-hour rolling window
 * - Timer resets 24 hours after the LAST use, not at midnight
 * - Only Text Analysis is allowed for free users
 * - Image Analysis, Humanizer, and Image-to-Text are Pro-only
 * - PDF Reports, History Export, Priority Support are Pro-only
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
  last_usage_date: string | null
  last_usage_timestamp: string | null // New: precise timestamp for 24h rolling reset
}

// Feature access control
export type FeatureType = 'text-analysis' | 'image-analysis' | 'humanizer' | 'image-to-text' | 'pdf-report' | 'history-export' | 'priority-support'

// Features available to free users (only text analysis with 2/day limit)
const FREE_ALLOWED_FEATURES: FeatureType[] = ['text-analysis']

// Pro-only features
const PRO_ONLY_FEATURES: FeatureType[] = ['image-analysis', 'humanizer', 'image-to-text', 'pdf-report', 'history-export', 'priority-support']

const FREE_DAILY_LIMIT = 2
const RESET_WINDOW_HOURS = 24
const GUEST_DAILY_LIMIT = 1 // Guests get 1 free analysis per 24h

/**
 * Check if a feature is allowed for the user based on their Pro status
 * STRICT: Non-Pro users can ONLY use text-analysis
 */
export function isFeatureAllowed(isPro: boolean, feature: FeatureType): boolean {
  if (isPro) return true
  return FREE_ALLOWED_FEATURES.includes(feature)
}

/**
 * Get a 403 Forbidden response for locked features
 */
export function getFeatureLockedResponse(feature: FeatureType, language: string = 'en'): { error: string; errorCode: string; requiresUpgrade: boolean } {
  const featureNames: Record<FeatureType, { en: string; ar: string }> = {
    'text-analysis': { en: 'Text Analysis', ar: 'تحليل النص' },
    'image-analysis': { en: 'Image Analysis', ar: 'تحليل الصور' },
    'humanizer': { en: 'Humanizer', ar: 'المحول البشري' },
    'image-to-text': { en: 'Image to Text', ar: 'تحويل الصورة لنص' },
    'pdf-report': { en: 'PDF Reports', ar: 'تقارير PDF' },
    'history-export': { en: 'History Export', ar: 'تصدير السجل' },
    'priority-support': { en: 'Priority Support', ar: 'دعم الأولوية' }
  }

  const name = language === 'ar' ? featureNames[feature].ar : featureNames[feature].en
  
  return {
    error: language === 'ar' 
      ? `${name} متاح فقط للمشتركين Pro. قم بالترقية للحصول على وصول كامل.`
      : `${name} is only available for Pro subscribers. Upgrade to get full access.`,
    errorCode: 'FEATURE_LOCKED',
    requiresUpgrade: true
  }
}

/**
 * Calculate remaining time until usage reset (24h from last use)
 */
function calculateResetTime(lastUsageTimestamp: string | null): string | null {
  if (!lastUsageTimestamp) return null
  
  const lastUse = new Date(lastUsageTimestamp)
  const resetTime = new Date(lastUse.getTime() + RESET_WINDOW_HOURS * 60 * 60 * 1000)
  return resetTime.toISOString()
}

/**
 * Check if usage count should be reset based on 24h rolling window
 */
function shouldResetUsage(lastUsageTimestamp: string | null): boolean {
  if (!lastUsageTimestamp) return true
  
  const lastUse = new Date(lastUsageTimestamp)
  const now = new Date()
  const hoursSinceLastUse = (now.getTime() - lastUse.getTime()) / (1000 * 60 * 60)
  
  return hoursSinceLastUse >= RESET_WINDOW_HOURS
}

/**
 * Check if user can perform an analysis and increment usage if allowed
 * This is the main function called by API routes before processing
 * 
 * PRODUCTION RULES:
 * - Pro users: unlimited access, always allowed
 * - Free users: exactly 2 uses per 24-hour rolling window
 * - 24h timer resets from the LAST use, not midnight
 */
export async function checkAndIncrementUsage(userId: string, feature: FeatureType = 'text-analysis'): Promise<UsageStatus> {
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
    // First, get the user's profile to check Pro status
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_pro, daily_usage_count, last_usage_timestamp')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[FREEMIUM] Error fetching profile:', profileError)
    }

    const isPro = profile?.is_pro ?? false
    
    // STRICT FEATURE GATE: Check if feature is allowed for this user
    if (!isFeatureAllowed(isPro, feature)) {
      console.log(`[FREEMIUM] Feature ${feature} blocked for non-Pro user ${userId}`)
      return {
        canUse: false,
        isPro: false,
        remaining: 0,
        usedToday: 0,
        limit: FREE_DAILY_LIMIT,
        message: `This feature requires Pro. Upgrade to unlock ${feature}.`
      }
    }

    // Pro users: unlimited access
    if (isPro) {
      return {
        canUse: true,
        isPro: true,
        remaining: -1, // Unlimited
        usedToday: 0,
        limit: -1,
        message: 'Unlimited Pro access'
      }
    }

    // Free users: strict 2 uses per 24h rolling window
    const lastUsageTimestamp = profile?.last_usage_timestamp
    let currentUsageCount = profile?.daily_usage_count ?? 0

    // Check if we should reset the counter (24h since last use)
    if (shouldResetUsage(lastUsageTimestamp)) {
      currentUsageCount = 0
    }

    // STRICT GATE: Check if user has exceeded limit
    if (currentUsageCount >= FREE_DAILY_LIMIT) {
      const resetTime = calculateResetTime(lastUsageTimestamp)
      console.log(`[FREEMIUM] Usage limit reached for user ${userId}. Reset at: ${resetTime}`)
      return {
        canUse: false,
        isPro: false,
        remaining: 0,
        usedToday: currentUsageCount,
        limit: FREE_DAILY_LIMIT,
        message: 'Daily limit reached. Upgrade to Pro for unlimited analyses.',
        resetTime: resetTime ?? undefined
      }
    }

    // Increment usage count and update timestamp
    const newUsageCount = currentUsageCount + 1
    const now = new Date().toISOString()

    console.log(`[FREEMIUM] Attempting to update usage for user ${userId}: ${currentUsageCount} -> ${newUsageCount}`)

    // Use update if profile exists, otherwise insert
    let updateError = null
    
    if (profile) {
      // Profile exists, use update
      const { error } = await supabase
        .from('user_profiles')
        .update({
          daily_usage_count: newUsageCount,
          last_usage_timestamp: now,
          updated_at: now
        })
        .eq('id', userId)
      updateError = error
    } else {
      // Profile doesn't exist, insert new record
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          daily_usage_count: newUsageCount,
          last_usage_timestamp: now,
          is_pro: false,
          updated_at: now,
          created_at: now
        })
      updateError = error
    }

    if (updateError) {
      console.error('[FREEMIUM] Error updating usage:', updateError)
      // STRICT: On update error, DENY the request to ensure credits are properly tracked
      return {
        canUse: false,
        isPro: false,
        remaining: FREE_DAILY_LIMIT - currentUsageCount,
        usedToday: currentUsageCount,
        limit: FREE_DAILY_LIMIT,
        message: 'Failed to update usage. Please try again.'
      }
    }

    const remaining = FREE_DAILY_LIMIT - newUsageCount
    const resetTime = calculateResetTime(now)

    console.log(`[FREEMIUM] Usage updated successfully for user ${userId}: ${newUsageCount}/${FREE_DAILY_LIMIT}, remaining: ${remaining}`)

    return {
      canUse: true,
      isPro: false,
      remaining: remaining,
      usedToday: newUsageCount,
      limit: FREE_DAILY_LIMIT,
      message: remaining > 0 
        ? `${remaining} ${remaining === 1 ? 'analysis' : 'analyses'} remaining`
        : 'This was your last free analysis. Upgrade to Pro for unlimited access.',
      resetTime: resetTime ?? undefined
    }
  } catch (err) {
    console.error('[FREEMIUM] Exception checking usage:', err)
    // STRICT MODE: On error, DENY access to prevent abuse
    return {
      canUse: false,
      isPro: false,
      remaining: 0,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Usage check failed. Please try again.'
    }
  }
}

/**
 * Get user's current usage status without incrementing
 * Used for displaying remaining uses in UI
 * Implements 24h rolling window logic
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
    // Direct query instead of RPC for more control
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_pro, daily_usage_count, last_usage_timestamp')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[FREEMIUM] Error getting status:', profileError)
    }

    const isPro = profile?.is_pro ?? false

    // Pro users: unlimited
    if (isPro) {
      return {
        canUse: true,
        isPro: true,
        remaining: -1,
        usedToday: 0,
        limit: -1,
        message: 'Unlimited Pro access'
      }
    }

    // Free users: check 24h rolling window
    const lastUsageTimestamp = profile?.last_usage_timestamp
    let usedToday = profile?.daily_usage_count ?? 0

    // Reset counter if 24h have passed since last use
    if (shouldResetUsage(lastUsageTimestamp)) {
      usedToday = 0
    }

    const remaining = Math.max(0, FREE_DAILY_LIMIT - usedToday)
    const canUse = remaining > 0
    const resetTime = calculateResetTime(lastUsageTimestamp)

    return {
      canUse,
      isPro: false,
      remaining,
      usedToday,
      limit: FREE_DAILY_LIMIT,
      message: canUse 
        ? `${remaining} ${remaining === 1 ? 'use' : 'uses'} remaining (resets 24h after last use)`
        : 'Daily limit reached. Upgrade for unlimited access.',
      resetTime: resetTime ?? undefined
    }
  } catch (err) {
    console.error('[FREEMIUM] Exception getting status:', err)
    return {
      canUse: false,
      isPro: false,
      remaining: 0,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Status check failed'
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
 * IMPORTANT: This function is called when a user subscribes to Pro via Lemon Squeezy
 * It finds the user by email in the user_profiles table and updates their status
 */
export async function updateUserToPro(
  userId: string | null,
  email: string | null,
  subscriptionId: string,
  customerId: string
): Promise<boolean> {
  console.log('[FREEMIUM] updateUserToPro called with:', { userId, email, subscriptionId, customerId })
  
  if (!isServerSupabaseConfigured()) {
    console.error('[FREEMIUM] Cannot update Pro status - Supabase not configured')
    return false
  }

  const supabase = createServerClient()
  if (!supabase) {
    console.error('[FREEMIUM] Cannot create Supabase client')
    return false
  }

  try {
    let targetUserId = userId

    // If no userId provided, find user by email in user_profiles table
    if (!targetUserId && email) {
      console.log('[FREEMIUM] Looking up user by email:', email)
      
      // First try to find in user_profiles by email
      const { data: profileByEmail, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .single()
      
      if (profileByEmail && !profileError) {
        targetUserId = profileByEmail.id
        console.log('[FREEMIUM] Found user by email in profiles:', targetUserId)
      } else {
        console.log('[FREEMIUM] User not found in profiles by email, trying admin API')
        
        // Fallback: Try admin API to list users and find by email
        try {
          const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
          if (authError) {
            console.error('[FREEMIUM] Admin listUsers failed:', authError)
          } else if (authData?.users) {
            const foundUser = authData.users.find(u => 
              u.email?.toLowerCase() === email.toLowerCase()
            )
            if (foundUser) {
              targetUserId = foundUser.id
              console.log('[FREEMIUM] Found user via admin API:', targetUserId)
            }
          }
        } catch (adminErr) {
          console.error('[FREEMIUM] Admin API exception:', adminErr)
        }
      }
    }

    // If still no user found, create a placeholder entry with email
    // The user's profile will be linked when they next log in
    if (!targetUserId && email) {
      console.log('[FREEMIUM] Creating pending Pro activation for email:', email)
      
      // Store in a separate table or use email as temporary key
      const { error: pendingError } = await supabase
        .from('pending_pro_activations')
        .upsert({
          email: email.toLowerCase(),
          subscription_id: subscriptionId,
          customer_id: customerId,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'email'
        })
      
      if (pendingError) {
        // Table might not exist, try direct update by email on user_profiles
        console.log('[FREEMIUM] pending_pro_activations table may not exist, trying direct email update')
        
        const { error: directError, data: directData } = await supabase
          .from('user_profiles')
          .update({
            is_pro: true,
            subscription_id: subscriptionId,
            customer_id: customerId,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('email', email.toLowerCase())
          .select()
        
        if (directError) {
          console.error('[FREEMIUM] Direct email update failed:', directError)
          return false
        }
        
        if (directData && directData.length > 0) {
          console.log('[FREEMIUM] Successfully updated user by email:', email)
          return true
        }
        
        console.error('[FREEMIUM] No user found with email:', email)
        return false
      }
      
      console.log('[FREEMIUM] Stored pending Pro activation for:', email)
      return true
    }

    if (!targetUserId) {
      console.error('[FREEMIUM] Cannot find user to update Pro status - no userId or email match')
      return false
    }

    // Update user profile to Pro
    console.log('[FREEMIUM] Updating user to Pro:', targetUserId)
    
    const { error, data } = await supabase
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
      .select()

    if (error) {
      console.error('[FREEMIUM] Error updating Pro status:', error)
      return false
    }

    console.log('[FREEMIUM] User upgraded to Pro successfully:', { targetUserId, data })
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

// ============================================================================
// GUEST RATE LIMITING (IP + Fingerprint based)
// ============================================================================

// In-memory store for guest usage (for serverless, consider using Redis/Upstash)
const guestUsageStore = new Map<string, { count: number; lastUse: number }>()

/**
 * Generate a unique identifier for guests based on IP and fingerprint
 */
export function generateGuestId(ip: string, fingerprint?: string): string {
  const combined = `${ip}:${fingerprint || 'no-fp'}`
  // Simple hash for privacy
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `guest_${Math.abs(hash).toString(36)}`
}

/**
 * Check and increment usage for guest (non-authenticated) users
 * Uses IP + fingerprint to track usage
 */
export async function checkGuestUsage(
  ip: string,
  fingerprint?: string,
  feature: FeatureType = 'text-analysis'
): Promise<UsageStatus> {
  // Guests can ONLY use text-analysis
  if (feature !== 'text-analysis') {
    return {
      canUse: false,
      isPro: false,
      remaining: 0,
      usedToday: 0,
      limit: GUEST_DAILY_LIMIT,
      message: 'Sign in to access this feature, or upgrade to Pro for full access.'
    }
  }

  const guestId = generateGuestId(ip, fingerprint)
  const now = Date.now()
  const windowMs = RESET_WINDOW_HOURS * 60 * 60 * 1000

  // Get existing usage from store
  const existing = guestUsageStore.get(guestId)
  
  // Check if we should reset (24h window passed)
  if (existing && (now - existing.lastUse) >= windowMs) {
    guestUsageStore.delete(guestId)
  }

  const currentUsage = guestUsageStore.get(guestId)
  const usedCount = currentUsage?.count ?? 0

  // Check if limit reached
  if (usedCount >= GUEST_DAILY_LIMIT) {
    const resetTime = currentUsage ? new Date(currentUsage.lastUse + windowMs).toISOString() : undefined
    console.log(`[FREEMIUM] Guest ${guestId} limit reached. Reset at: ${resetTime}`)
    return {
      canUse: false,
      isPro: false,
      remaining: 0,
      usedToday: usedCount,
      limit: GUEST_DAILY_LIMIT,
      message: 'Sign in for 2 free analyses per day, or upgrade to Pro for unlimited access.',
      resetTime
    }
  }

  // Increment usage
  const newCount = usedCount + 1
  guestUsageStore.set(guestId, { count: newCount, lastUse: now })

  console.log(`[FREEMIUM] Guest ${guestId} usage: ${newCount}/${GUEST_DAILY_LIMIT}`)

  const remaining = GUEST_DAILY_LIMIT - newCount
  return {
    canUse: true,
    isPro: false,
    remaining,
    usedToday: newCount,
    limit: GUEST_DAILY_LIMIT,
    message: remaining > 0 
      ? `${remaining} guest analysis remaining. Sign in for more!`
      : 'Sign in for 2 free analyses per day!'
  }
}

/**
 * Get guest usage status without incrementing
 */
export function getGuestUsageStatus(ip: string, fingerprint?: string): UsageStatus {
  const guestId = generateGuestId(ip, fingerprint)
  const now = Date.now()
  const windowMs = RESET_WINDOW_HOURS * 60 * 60 * 1000

  const existing = guestUsageStore.get(guestId)
  
  // Check if window passed
  if (existing && (now - existing.lastUse) >= windowMs) {
    guestUsageStore.delete(guestId)
    return {
      canUse: true,
      isPro: false,
      remaining: GUEST_DAILY_LIMIT,
      usedToday: 0,
      limit: GUEST_DAILY_LIMIT,
      message: `${GUEST_DAILY_LIMIT} free guest analysis available`
    }
  }

  const usedCount = existing?.count ?? 0
  const remaining = Math.max(0, GUEST_DAILY_LIMIT - usedCount)

  return {
    canUse: remaining > 0,
    isPro: false,
    remaining,
    usedToday: usedCount,
    limit: GUEST_DAILY_LIMIT,
    message: remaining > 0 
      ? `${remaining} guest analysis remaining`
      : 'Sign in for more free analyses'
  }
}

/**
 * Extract client IP from request headers
 */
export function extractClientIP(headers: Headers): string {
  // Check various headers in order of preference
  const xForwardedFor = headers.get('x-forwarded-for')
  if (xForwardedFor) {
    // Take the first IP (client IP) from comma-separated list
    return xForwardedFor.split(',')[0].trim()
  }
  
  const xRealIp = headers.get('x-real-ip')
  if (xRealIp) return xRealIp
  
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp
  
  // Fallback
  return 'unknown'
}
