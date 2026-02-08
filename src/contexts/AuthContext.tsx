'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

interface UsageStatus {
  isPro: boolean
  plan?: 'free' | 'pro' | 'lifetime'
  remaining: number
  usedToday: number
  limit: number
  isGuest?: boolean
  message?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  usageStatus: UsageStatus | null
  signInWithOTP: (email: string) => Promise<{ error: string | null }>
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  verifyOTP: (email: string, token: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshUsageStatus: () => Promise<void>
  updateUsageFromResponse: (usageData: { remaining: number; usedToday: number; limit: number; isPro: boolean }) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const defaultUsageStatus: UsageStatus = {
  isPro: false,
  remaining: 2,
  usedToday: 0,
  limit: 2,
  isGuest: true
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null)

  // Fetch usage status from API - ALWAYS reads from database (user_profiles table)
  const fetchUsageStatus = useCallback(async (session: Session | null, forceRefresh: boolean = false) => {
    try {
      console.log('[AuthContext] ======== FETCHING USAGE STATUS ========')
      console.log('[AuthContext] Session exists:', !!session)
      console.log('[AuthContext] Force refresh:', forceRefresh)
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Request-Time': Date.now().toString() // Prevent any caching
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      // Add timestamp and force param to prevent caching - force fresh data from DB
      const url = `/api/user/usage?t=${Date.now()}&nocache=true${forceRefresh ? '&force=true' : ''}`
      console.log('[AuthContext] Fetching from:', url)
      
      const response = await fetch(url, { 
        headers,
        cache: 'no-store',
        next: { revalidate: 0 }
      })
      const data = await response.json()
      
      // Log for debugging - this reads DIRECTLY from user_profiles table
      console.log('[AuthContext] Usage status received from DB:', { 
        isPro: data.isPro, 
        plan: data.plan,
        userId: data.userId,
        remaining: data.remaining,
        usedToday: data.usedToday,
        subscriptionStatus: data.subscriptionStatus
      })
      
      // IMPORTANT: Make sure isPro is a boolean
      const normalizedData = {
        ...data,
        isPro: data.isPro === true || data.isPro === 'true',
        plan: data.plan || 'free'
      }
      
      console.log('[AuthContext] Final normalized status:', {
        isPro: normalizedData.isPro,
        plan: normalizedData.plan
      })
      
      setUsageStatus(normalizedData)
    } catch (err) {
      console.error('[AuthContext] Error fetching usage status:', err)
      setUsageStatus(defaultUsageStatus)
    }
  }, [])

  const refreshUsageStatus = useCallback(async () => {
    console.log('[AuthContext] refreshUsageStatus called')
    
    if (!isSupabaseConfigured()) {
      console.log('[AuthContext] Supabase not configured, using defaults')
      setUsageStatus(defaultUsageStatus)
      return
    }
    
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    console.log('[AuthContext] Session for refresh:', !!session)
    await fetchUsageStatus(session, true) // Force refresh from DB
  }, [fetchUsageStatus])

  // Update usage status directly from API response data (instant UI update)
  const updateUsageFromResponse = useCallback((usageData: { remaining: number; usedToday: number; limit: number; isPro: boolean }) => {
    console.log('[AuthContext] updateUsageFromResponse called with:', usageData)
    setUsageStatus(prev => {
      if (!prev) return prev
      return {
        ...prev,
        remaining: usageData.remaining,
        usedToday: usageData.usedToday,
        limit: usageData.limit,
        isPro: usageData.isPro
      }
    })
  }, [])

  useEffect(() => {
    // Skip auth initialization if Supabase is not configured
    if (!isSupabaseConfigured()) {
      setLoading(false)
      setUsageStatus(defaultUsageStatus)
      return
    }

    const supabase = createClient()
    
    // Get initial session
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
      fetchUsageStatus(data.session)
    }).catch(() => {
      setLoading(false)
      setUsageStatus(defaultUsageStatus)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null)
        await fetchUsageStatus(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUsageStatus])

  const signInWithOTP = async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication service not configured' }
    }
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback` 
            : undefined,
        },
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to send OTP' }
    }
  }

  const signInWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication service not configured' }
    }
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to sign in' }
    }
  }

  const signUpWithPassword = async (email: string, password: string, fullName?: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication service not configured' }
    }
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to sign up' }
    }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication service not configured' }
    }
    if (typeof window === 'undefined') {
      return { error: 'Cannot sign in with Google on server' }
    }
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to sign in with Google' }
    }
  }

  const verifyOTP = async (email: string, token: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication service not configured' }
    }
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to verify OTP' }
    }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      setUser(null)
      setUsageStatus(defaultUsageStatus)
      return
    }
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      setUsageStatus(defaultUsageStatus)
    } catch {
      setUser(null)
      setUsageStatus(defaultUsageStatus)
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      usageStatus,
      signInWithOTP, 
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      verifyOTP, 
      signOut,
      refreshUsageStatus,
      updateUsageFromResponse
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
