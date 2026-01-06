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

export async function analyzeText(text: string): Promise<AnalysisResult> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
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
