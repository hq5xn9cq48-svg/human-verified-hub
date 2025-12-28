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
