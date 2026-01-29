import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Create admin client for user_profiles operations
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceKey) {
    return null
  }
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Ensure user profile exists with email (critical for Pro activation via webhook)
async function ensureUserProfile(userId: string, email: string | undefined, fullName?: string) {
  const adminClient = createAdminClient()
  if (!adminClient || !email) {
    console.log('[AUTH CALLBACK] Cannot create profile - missing admin client or email')
    return
  }

  try {
    // Check if profile exists
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      // Profile exists, update email if missing
      if (!existingProfile.email) {
        console.log('[AUTH CALLBACK] Updating profile with email:', email)
        await adminClient
          .from('user_profiles')
          .update({ 
            email: email.toLowerCase(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
      }
      
      // Check for pending Pro activation
      const { data: pendingPro } = await adminClient
        .from('pending_pro_activations')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()
      
      if (pendingPro) {
        console.log('[AUTH CALLBACK] Found pending Pro activation for:', email)
        // Activate Pro status
        await adminClient
          .from('user_profiles')
          .update({
            is_pro: true,
            subscription_id: pendingPro.subscription_id,
            customer_id: pendingPro.customer_id,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        
        // Remove pending activation
        await adminClient
          .from('pending_pro_activations')
          .delete()
          .eq('email', email.toLowerCase())
        
        console.log('[AUTH CALLBACK] Pro status activated for user:', userId)
      }
    } else {
      // Create new profile with email
      console.log('[AUTH CALLBACK] Creating new profile for user:', userId, email)
      
      // Check for pending Pro activation first
      const { data: pendingPro } = await adminClient
        .from('pending_pro_activations')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()
      
      const profileData: Record<string, unknown> = {
        id: userId,
        email: email.toLowerCase(),
        full_name: fullName || null,
        is_pro: !!pendingPro,
        subscription_id: pendingPro?.subscription_id || null,
        customer_id: pendingPro?.customer_id || null,
        subscription_status: pendingPro ? 'active' : null,
        daily_usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      await adminClient
        .from('user_profiles')
        .insert(profileData)
      
      // Remove pending activation if used
      if (pendingPro) {
        await adminClient
          .from('pending_pro_activations')
          .delete()
          .eq('email', email.toLowerCase())
        
        console.log('[AUTH CALLBACK] Pro status activated for new user:', userId)
      }
    }
  } catch (err) {
    console.error('[AUTH CALLBACK] Error ensuring user profile:', err)
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  // Handle password recovery redirect
  if (type === 'recovery') {
    // Redirect to reset password page - the hash fragment with tokens will be preserved
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.session?.user) {
      const user = data.session.user
      
      // CRITICAL: Ensure user profile exists with email for webhook Pro activation
      await ensureUserProfile(
        user.id, 
        user.email,
        user.user_metadata?.full_name || user.user_metadata?.name
      )
      
      // Check if this is a recovery session
      if (user.aud === 'authenticated' && user.recovery_sent_at) {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth?error=Could not authenticate user`)
}
