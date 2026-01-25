export interface Verification {
  id: string
  user_id: string
  content: string
  result_score: number
  analysis: string | null
  created_at: string
}

export interface User {
  id: string
  email: string
  created_at: string
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
  // Freemium usage tracking
  daily_usage_count: number
  last_usage_date: string | null // Legacy: midnight reset
  last_usage_timestamp: string | null // New: 24h rolling reset (ISO timestamp of last use)
  created_at: string
  updated_at: string
}
