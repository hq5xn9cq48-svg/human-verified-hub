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
  plan: 'free' | 'pro' | 'lifetime'
  subscription_id: string | null
  customer_id: string | null
  subscription_status: string | null
  subscription_ends_at: string | null // When the subscription expires
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
  console.log(`[FREEMIUM] checkAndIncrementUsage called for user ${userId}, feature: ${feature}`)
  
  // If Supabase not configured, allow unlimited access (dev mode)
  if (!isServerSupabaseConfigured()) {
    console.log('[FREEMIUM] Supabase not configured - allowing unlimited access')
    return {
      canUse: true,
      isPro: false,
      remaining: FREE_DAILY_LIMIT,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Development mode - unlimited access'
    }
  }

  const supabase = createServerClient()
  if (!supabase) {
    console.log('[FREEMIUM] Could not create Supabase client - allowing access')
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
    // First, get the user's profile to check Pro status
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_pro, daily_usage_count, last_usage_timestamp')
      .eq('id', userId)
      .single()

    // Log the profile fetch result
    console.log(`[FREEMIUM] Profile fetch result:`, { 
      hasProfile: !!profile, 
      error: profileError?.code,
      is_pro: profile?.is_pro,
      daily_usage_count: profile?.daily_usage_count
    })

    // PGRST116 means no rows returned - user profile doesn't exist yet
    const profileExists = !profileError || profileError.code !== 'PGRST116'
    
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
      console.log(`[FREEMIUM] User ${userId} is Pro - unlimited access`)
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
      console.log(`[FREEMIUM] Resetting usage counter for user ${userId} (24h passed)`)
      currentUsageCount = 0
    }

    console.log(`[FREEMIUM] Current usage for user ${userId}: ${currentUsageCount}/${FREE_DAILY_LIMIT}`)

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

    // Decide between update and insert based on profile existence
    let updateError = null

    if (profileExists && profile) {
      // UPDATE existing profile - more reliable than upsert
      console.log(`[FREEMIUM] Profile exists, using UPDATE for user ${userId}`)
      const { error, data } = await supabase
        .from('user_profiles')
        .update({
          daily_usage_count: newUsageCount,
          last_usage_timestamp: now
        })
        .eq('id', userId)
        .select()
      
      console.log(`[FREEMIUM] UPDATE result:`, { error: error?.message, data })
      updateError = error
    } else {
      // INSERT new profile
      console.log(`[FREEMIUM] Profile does not exist, using INSERT for user ${userId}`)
      const { error, data } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          daily_usage_count: newUsageCount,
          last_usage_timestamp: now,
          is_pro: false,
          created_at: now
        })
        .select()
      
      console.log(`[FREEMIUM] INSERT result:`, { error: error?.message, data })
      
      // If insert fails (maybe race condition or profile already exists), try update
      if (error) {
        console.log(`[FREEMIUM] Insert failed (${error.code}), trying update as fallback`)
        const { error: fallbackError, data: fallbackData } = await supabase
          .from('user_profiles')
          .update({
            daily_usage_count: newUsageCount,
            last_usage_timestamp: now
          })
          .eq('id', userId)
          .select()
        
        console.log(`[FREEMIUM] Fallback UPDATE result:`, { error: fallbackError?.message, data: fallbackData })
        updateError = fallbackError
      } else {
        updateError = error
      }
    }

    if (updateError) {
      console.error('[FREEMIUM] Error updating usage:', updateError)
      // On error, still return proper count but warn
      console.log('[FREEMIUM] WARNING: Usage tracking may be inaccurate')
      return {
        canUse: true,
        isPro: false,
        remaining: FREE_DAILY_LIMIT - currentUsageCount - 1,
        usedToday: currentUsageCount + 1,
        limit: FREE_DAILY_LIMIT,
        message: `${FREE_DAILY_LIMIT - currentUsageCount - 1} analyses remaining`
      }
    }
    
    console.log(`[FREEMIUM] Usage update SUCCESS for user ${userId}`)

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
    // PERMISSIVE MODE: On error, ALLOW access to not block users
    // Better UX - let users use the service even if tracking fails
    return {
      canUse: true,
      isPro: false,
      remaining: FREE_DAILY_LIMIT,
      usedToday: 0,
      limit: FREE_DAILY_LIMIT,
      message: 'Service available'
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
 * It finds the user by email and updates their status to Pro
 */
export async function updateUserToPro(
  userId: string | null,
  email: string | null,
  subscriptionId: string,
  customerId: string
): Promise<boolean> {
  console.log('[FREEMIUM] ========== UPDATE USER TO PRO ==========')
  console.log('[FREEMIUM] Input:', { userId, email, subscriptionId, customerId })
  
  if (!isServerSupabaseConfigured()) {
    console.error('[FREEMIUM] FAILED: Supabase not configured')
    return false
  }

  const supabase = createServerClient()
  if (!supabase) {
    console.error('[FREEMIUM] FAILED: Cannot create Supabase client')
    return false
  }

  try {
    let targetUserId = userId
    const normalizedEmail = email?.toLowerCase()?.trim()

    console.log('[FREEMIUM] Normalized email:', normalizedEmail)

    // STEP 1: If userId provided, use it directly
    if (targetUserId) {
      console.log('[FREEMIUM] Step 1: Using provided userId:', targetUserId)
    }
    
    // STEP 2: Find user by email using Admin API (most reliable)
    if (!targetUserId && normalizedEmail) {
      console.log('[FREEMIUM] Step 2: Looking up user by email via Admin API:', normalizedEmail)
      
      try {
        // Use listUsers to find the user by email
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
          perPage: 1000
        })
        
        if (authError) {
          console.error('[FREEMIUM] Admin API error:', authError.message, authError)
        } else if (authData?.users) {
          console.log('[FREEMIUM] Found', authData.users.length, 'total users in auth')
          
          // Log first few emails for debugging (partial for privacy)
          const emailSamples = authData.users.slice(0, 5).map(u => 
            u.email ? `${u.email.substring(0, 3)}...@${u.email.split('@')[1]}` : 'no-email'
          )
          console.log('[FREEMIUM] Sample emails in system:', emailSamples)
          
          const foundUser = authData.users.find(u => 
            u.email?.toLowerCase()?.trim() === normalizedEmail
          )
          
          if (foundUser) {
            targetUserId = foundUser.id
            console.log('[FREEMIUM] SUCCESS: Found user via Admin API:', targetUserId)
          } else {
            console.log('[FREEMIUM] User NOT found in auth.users for email:', normalizedEmail)
            
            // Try partial match (in case of different case or spaces)
            const partialMatch = authData.users.find(u => 
              u.email?.toLowerCase()?.includes(normalizedEmail.split('@')[0])
            )
            if (partialMatch) {
              console.log('[FREEMIUM] Found partial match:', partialMatch.email)
            }
          }
        }
      } catch (adminErr) {
        console.error('[FREEMIUM] Admin API exception:', adminErr)
      }
    }

    // STEP 3: Try to find in user_profiles table by email
    if (!targetUserId && normalizedEmail) {
      console.log('[FREEMIUM] Step 3: Looking up in user_profiles by email')
      
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .ilike('email', normalizedEmail)
      
      if (profileError) {
        console.error('[FREEMIUM] Profile lookup error:', profileError.message)
      } else if (profiles && profiles.length > 0) {
        targetUserId = profiles[0].id
        console.log('[FREEMIUM] SUCCESS: Found user in profiles:', targetUserId)
      } else {
        console.log('[FREEMIUM] No profile found for email:', normalizedEmail)
        
        // List all profiles for debugging
        const { data: allProfiles } = await supabase
          .from('user_profiles')
          .select('id, email')
          .limit(10)
        
        if (allProfiles && allProfiles.length > 0) {
          console.log('[FREEMIUM] Sample profiles in DB:', allProfiles.map(p => 
            p.email ? `${p.email.substring(0, 3)}...` : 'no-email'
          ))
        }
      }
    }

    // STEP 4: If user found, update their profile to Pro
    if (targetUserId) {
      console.log('[FREEMIUM] Step 4: Updating user to Pro:', targetUserId)
      
      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id, is_pro')
        .eq('id', targetUserId)
        .single()
      
      console.log('[FREEMIUM] Existing profile check:', { existingProfile, error: checkError?.message })
      
      if (existingProfile) {
        // UPDATE existing profile
        console.log('[FREEMIUM] Profile exists, using UPDATE')
        const { error: updateError, data: updateData } = await supabase
          .from('user_profiles')
          .update({
            is_pro: true,
            plan: 'pro', // IMPORTANT: Also update plan to 'pro'
            subscription_id: subscriptionId,
            customer_id: customerId,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', targetUserId)
          .select()

        if (updateError) {
          console.error('[FREEMIUM] UPDATE error:', updateError.message, updateError)
          return false
        }
        console.log('[FREEMIUM] UPDATE succeeded:', updateData)
      } else {
        // INSERT new profile
        console.log('[FREEMIUM] Profile does not exist, using INSERT')
        const { error: insertError, data: insertData } = await supabase
          .from('user_profiles')
          .insert({
            id: targetUserId,
            email: normalizedEmail,
            is_pro: true,
            plan: 'pro', // IMPORTANT: Set plan to 'pro'
            subscription_id: subscriptionId,
            customer_id: customerId,
            subscription_status: 'active',
            created_at: new Date().toISOString()
          })
          .select()

        if (insertError) {
          console.error('[FREEMIUM] INSERT error:', insertError.message, insertError)
          return false
        }
        console.log('[FREEMIUM] INSERT succeeded:', insertData)
      }

      console.log('[FREEMIUM] ✅ SUCCESS: User upgraded to Pro:', targetUserId)
      
      // Verify the update
      const { data: verifyProfile, error: verifyError } = await supabase
        .from('user_profiles')
        .select('id, email, is_pro, subscription_status')
        .eq('id', targetUserId)
        .single()
      
      console.log('[FREEMIUM] Verification:', { verifyProfile, error: verifyError?.message })
      
      if (!verifyProfile?.is_pro) {
        console.error('[FREEMIUM] ❌ CRITICAL: Verification failed - is_pro is still false!')
        return false
      }
      
      // Clean up any pending activation for this email
      if (normalizedEmail) {
        try {
          await supabase
            .from('pending_pro_activations')
            .delete()
            .eq('email', normalizedEmail)
          console.log('[FREEMIUM] Cleaned up pending activation record')
        } catch (cleanupErr) {
          // Ignore cleanup errors
        }
      }
      
      return true
    }

    // STEP 5: No user found - store for later activation when they sign up
    if (normalizedEmail) {
      console.log('[FREEMIUM] Step 5: No user found, storing pending activation for:', normalizedEmail)
      
      // Try to create pending activation record
      try {
        // First check if table exists by trying to select
        const { error: checkError } = await supabase
          .from('pending_pro_activations')
          .select('email')
          .limit(1)
        
        if (!checkError) {
          // Table exists, upsert the record
          const { error: upsertError } = await supabase
            .from('pending_pro_activations')
            .upsert({
              email: normalizedEmail,
              subscription_id: subscriptionId,
              customer_id: customerId,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'email'
            })
          
          if (upsertError) {
            console.error('[FREEMIUM] Pending activation upsert error:', upsertError.message)
          } else {
            console.log('[FREEMIUM] ✅ Stored pending activation successfully')
          }
        } else {
          console.log('[FREEMIUM] pending_pro_activations table check error:', checkError.message)
          
          // Try to create the table
          console.log('[FREEMIUM] Attempting to create pending_pro_activations table...')
        }
      } catch (pendingErr) {
        console.log('[FREEMIUM] Could not store pending activation:', pendingErr)
      }
      
      // IMPORTANT: Return FALSE here because the user was NOT found
      // This makes the error visible in logs
      console.error('[FREEMIUM] ❌ FAILED: User not found for email:', normalizedEmail)
      console.error('[FREEMIUM] The user must sign up with this exact email to receive Pro status')
      return false
    }

    console.error('[FREEMIUM] FAILED: No userId or email provided')
    return false
    
  } catch (err) {
    console.error('[FREEMIUM] Exception:', err)
    return false
  }
}

/**
 * Downgrade user from Pro (called by webhook on cancellation/expiry)
 */
export async function downgradeUserFromPro(
  subscriptionId: string,
  status: string = 'cancelled'
): Promise<boolean> {
  console.log('[FREEMIUM] ========== DOWNGRADE USER FROM PRO ==========')
  console.log('[FREEMIUM] Input:', { subscriptionId, status })

  if (!isServerSupabaseConfigured()) {
    console.error('[FREEMIUM] Supabase not configured')
    return false
  }

  const supabase = createServerClient()
  if (!supabase) {
    console.error('[FREEMIUM] Cannot create Supabase client')
    return false
  }

  try {
    // First find the user with this subscription
    const { data: profile, error: findError } = await supabase
      .from('user_profiles')
      .select('id, email, is_pro')
      .eq('subscription_id', subscriptionId)
      .single()

    if (findError || !profile) {
      console.error('[FREEMIUM] Could not find user with subscription:', subscriptionId, findError?.message)
      return false
    }

    console.log('[FREEMIUM] Found user to downgrade:', { id: profile.id, email: profile.email, is_pro: profile.is_pro })

    // Downgrade the user
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        is_pro: false,
        plan: 'free', // IMPORTANT: Also reset plan to 'free'
        subscription_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscriptionId)

    if (updateError) {
      console.error('[FREEMIUM] Error downgrading user:', updateError.message)
      return false
    }

    // Verify the downgrade
    const { data: verifyProfile } = await supabase
      .from('user_profiles')
      .select('id, is_pro, subscription_status')
      .eq('id', profile.id)
      .single()

    console.log('[FREEMIUM] Verification after downgrade:', verifyProfile)

    if (verifyProfile?.is_pro === false) {
      console.log(`[FREEMIUM] ✅ User ${profile.email} successfully downgraded from Pro`)
      return true
    } else {
      console.error('[FREEMIUM] ❌ Downgrade verification failed!')
      return false
    }
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
