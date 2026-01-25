'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

interface UsageStatus {
  isPro: boolean
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

  // Fetch usage status from API
  const fetchUsageStatus = useCallback(async (session: Session | null) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/user/usage', { 
        headers,
        cache: 'no-store' // Ensure fresh data on every fetch
      })
      const data = await response.json()
      console.log('[AUTH] Usage status fetched:', data) // Debug log
      setUsageStatus(data)
    } catch (err) {
      console.error('Error fetching usage status:', err)
      setUsageStatus(defaultUsageStatus)
    }
  }, [])

  const refreshUsageStatus = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUsageStatus(defaultUsageStatus)
      return
    }
    
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    await fetchUsageStatus(session)
  }, [fetchUsageStatus])

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
      refreshUsageStatus
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
