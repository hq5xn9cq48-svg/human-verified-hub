import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role for admin operations
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function createServerClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Supabase server credentials not configured')
    return null
  }
  
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Alias for backward compatibility
export const createClient = createServerClient

// Helper to check if server Supabase is configured
export function isServerSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
}

// Alias for backward compatibility
export const isSupabaseConfigured = isServerSupabaseConfigured
