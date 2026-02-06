// Interface for API response structure
interface ApiIndicator {
  pattern?: string
  description?: string
}

interface ApiAnalyzeResponse {
  humanScore?: number
  summary?: string
  analysis?: string
  aiIndicators?: ApiIndicator[]
  humanIndicators?: ApiIndicator[]
}

export interface AnalysisResult {
  humanScore: number
  analysis: string
  indicators: {
    type: 'human' | 'ai'
    description: string
  }[]
}

export async function analyzeText(text: string, language: string = 'en'): Promise<AnalysisResult> {
  // Build headers with auth token if available
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  
  // Get auth token from Supabase session to identify the user
  // This is CRITICAL for usage tracking - without it, the API treats the user as a guest
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch (e) {
    // If Supabase is not configured, continue without auth
    console.log('[analyzeText] Could not get auth token:', e)
  }

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, language }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to analyze text')
  }

  const data: ApiAnalyzeResponse = await response.json()
  
  // Transform API response to match AnalysisResult interface
  return {
    humanScore: data.humanScore ?? 50,
    analysis: data.summary ?? 'Analysis completed.',
    indicators: [
      ...(data.aiIndicators ?? []).map((i) => ({ 
        type: 'ai' as const, 
        description: i.description || i.pattern || 'AI indicator detected' 
      })),
      ...(data.humanIndicators ?? []).map((i) => ({ 
        type: 'human' as const, 
        description: i.description || i.pattern || 'Human indicator detected' 
      })),
    ],
  }
}
