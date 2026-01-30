import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role for admin operations
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function createServerClient() {
  // Log for debugging (remove in production if too verbose)
  console.log('[SUPABASE-SERVER] Creating client:', {
    hasUrl: !!SUPABASE_URL,
    urlPrefix: SUPABASE_URL?.substring(0, 30),
    hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyLength: SUPABASE_SERVICE_ROLE_KEY?.length || 0
  })
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[SUPABASE-SERVER] CRITICAL: Missing credentials!', {
      SUPABASE_URL: SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
    })
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
  const configured = !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  if (!configured) {
    console.warn('[SUPABASE-SERVER] Not configured:', {
      SUPABASE_URL: SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
    })
  }
  return configured
}

// Alias for backward compatibility
export const isSupabaseConfigured = isServerSupabaseConfigured
