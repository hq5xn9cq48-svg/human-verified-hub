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

  const data = await response.json()
  
  // Transform API response to match AnalysisResult interface
  return {
    humanScore: data.humanScore || 50,
    analysis: data.summary || data.analysis || 'Analysis completed.',
    indicators: [
      ...(data.aiIndicators || []).map((i: any) => ({ 
        type: 'ai' as const, 
        description: i.description || i.pattern || 'AI indicator detected' 
      })),
      ...(data.humanIndicators || []).map((i: any) => ({ 
        type: 'human' as const, 
        description: i.description || i.pattern || 'Human indicator detected' 
      })),
    ],
  }
}
