import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Placeholder values for when environment variables are missing
// This prevents build-time errors while still allowing runtime functionality
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

let supabaseClient: SupabaseClient | null = null

export function createClient() {
  // Check if we have valid environment variables
  const hasValidConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient
  }
  
  // Create client (will use placeholder values if env vars missing)
  supabaseClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  return supabaseClient
}

// Helper to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
