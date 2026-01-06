const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

export interface AnalysisResult {
  humanScore: number
  analysis: string
  indicators: {
    type: 'human' | 'ai'
    description: string
  }[]
}

export async function analyzeText(text: string): Promise<AnalysisResult> {
  // Check API key first
  if (!GEMINI_API_KEY) {
    throw new Error('API key not configured. Please set GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY environment variable.')
  }

  const prompt = `You are an expert AI content detector. Analyze the following text and determine if it was written by a human or AI.

Provide your analysis in the following JSON format ONLY (no additional text):
{
  "humanScore": <number between 0-100 representing likelihood the text was written by a human>,
  "analysis": "<detailed explanation of your analysis in English>",
  "indicators": [
    {"type": "human" or "ai", "description": "<specific indicator found in the text>"}
  ]
}

Important:
- Score of 100 means definitely human-written
- Score of 0 means definitely AI-generated
- Be specific about patterns, writing style, and linguistic markers
- Consider: vocabulary variation, emotional nuance, personal voice, structural patterns, generic phrasing, repetitive structures

Text to analyze:
"""
${text}
"""`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error('Failed to analyze text with Gemini API')
  }

  const data = await response.json()
  const responseText = data.candidates[0].content.parts[0].text

  // Extract JSON from the response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Invalid response format from Gemini API')
  }

  const result = JSON.parse(jsonMatch[0])
  return result as AnalysisResult
}
