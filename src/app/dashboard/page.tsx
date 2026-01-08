import { redirect } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

// Force dynamic rendering for auth pages
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // If Supabase is not configured, redirect to auth
  if (!isSupabaseConfigured()) {
    redirect('/auth')
  }

  const supabase = createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/auth')
    }

    return <DashboardClient user={user} />
  } catch {
    redirect('/auth')
  }
}
