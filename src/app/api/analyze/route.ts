import { NextResponse } from "next/server";
import * as cheerio from 'cheerio';

// Use environment variable only - no hardcoded keys
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const systemPrompt = `You are SENTINEL-AI V5.0, an expert forensic linguistic analyzer.

TASK: Analyze text to determine if it was written by a human or AI.

SCORING (0-100 scale):
- 0-30: AI Generated (robotic, perfect structure, AI patterns)
- 31-60: Uncertain/Hybrid (mixed signals)
- 61-100: Human Written (natural, imperfect, personal)

ANALYZE FOR:
1. AI Indicators (reduce score):
   - Perfect structure and grammar
   - Transitional phrases: "Furthermore", "Moreover", "In conclusion"
   - Generic language without personality
   - Uniform paragraph/sentence lengths
   - No personal experiences or emotions

2. Human Indicators (increase score):
   - Varied sentence lengths
   - Personal anecdotes and opinions
   - Minor imperfections
   - Colloquial language
   - Emotional expressions

OUTPUT FORMAT (JSON):
{
  "humanScore": number (0-100),
  "verdict": "AI Generated" | "Likely AI" | "Uncertain" | "Likely Human" | "Human Written",
  "confidence": "high" | "medium" | "low",
  "summary": "Brief explanation of the verdict",
  "analysisMetadata": {
    "wordCount": number,
    "sentenceCount": number,
    "perplexityLevel": "low" | "medium" | "high",
    "burstinessScore": "low" | "medium" | "high"
  },
  "aiIndicators": [{"pattern": "name", "description": "evidence", "penalty": number}],
  "humanIndicators": [{"pattern": "name", "description": "evidence", "bonus": number}],
  "forensicDetails": {
    "syntaxAnalysis": "brief",
    "lexicalRichness": "brief", 
    "predictability": "brief"
  },
  "smartBreakdown": ["Specific reason 1 why score was given", "Specific reason 2", "Specific reason 3"]
}

IMPORTANT: Include 3-5 specific bullet points in smartBreakdown explaining exactly WHY you gave this score. Be specific about patterns you detected.

Return ONLY valid JSON, no markdown.`;

async function scrapeUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('script, style, nav, header, footer, aside, iframe, noscript').remove();

    let content = '';
    const selectors = ['article', 'main', '.content', '.post-content', '#content', 'body'];
    
    for (const sel of selectors) {
      if ($(sel).length) {
        content = $(sel).text().replace(/\s+/g, ' ').trim();
        if (content.length > 100) break;
      }
    }

    return content.length > 50 ? content.substring(0, 10000) : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  // Check API key first
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ 
      error: "API key not configured. Please set GEMINI_API_KEY environment variable." 
    }, { status: 500 });
  }

  try {
    const body = await req.json();
    let { text, url, language = 'en' } = body;

    // Handle URL scraping
    if (url && typeof url === 'string') {
      try {
        new URL(url);
        const scraped = await scrapeUrl(url);
        if (!scraped) {
          return NextResponse.json({ 
            error: language === 'ar' ? "فشل في استخراج المحتوى" : "Failed to extract content from URL" 
          }, { status: 400 });
        }
        text = scraped;
      } catch {
        return NextResponse.json({ 
          error: language === 'ar' ? "رابط غير صالح" : "Invalid URL" 
        }, { status: 400 });
      }
    }

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json({ 
        error: language === 'ar' ? "النص قصير جداً" : "Text too short (min 10 chars)" 
      }, { status: 400 });
    }

    const analysisText = text.trim().substring(0, 8000);

    // Model fallback chain: Try fastest first, then fallback to stable models
    const modelChain = [
      'gemini-1.5-flash',      // Fastest - try first
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',        // More capable fallback
      'gemini-pro',            // Legacy stable fallback
    ];

    let responseText: string | null = null;
    let lastError: string = '';

    for (const modelName of modelChain) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        console.log(`Trying model: ${modelName}`);
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nAnalyze this text:\n"""${analysisText}"""` }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
                topP: 0.8,
                topK: 40,
              }
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          lastError = errData?.error?.message || errData?.error?.status || `HTTP ${response.status}`;
          console.error(`Model ${modelName} failed:`, lastError);
          
          // If model not found (404), try next model
          if (response.status === 404 || lastError.includes('not found')) {
            continue;
          }
          
          // For other errors, also try next model
          continue;
        }

        const data = await response.json();
        responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (responseText) {
          console.log(`Success with model: ${modelName}`);
          break; // Success! Exit the loop
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        lastError = fetchError.message || 'Fetch failed';
        console.error(`Model ${modelName} fetch error:`, lastError);
        
        if (fetchError.name === 'AbortError') {
          lastError = 'Request timed out';
        }
        // Continue to next model
        continue;
      }
    }

    // If all models failed
    if (!responseText) {
      return NextResponse.json({ 
        error: language === 'ar' ? 'فشل التحليل' : `Analysis failed: ${lastError}` 
      }, { status: 500 });
    }

    // Parse JSON from response
    let result;
    try {
      const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    } catch {
      result = {
        humanScore: 50,
        verdict: "Uncertain",
        confidence: "low",
        summary: "Analysis could not be completed properly.",
        analysisMetadata: {
          wordCount: analysisText.split(/\s+/).length,
          sentenceCount: analysisText.split(/[.!?]+/).length,
          perplexityLevel: "medium",
          burstinessScore: "medium"
        },
        aiIndicators: [],
        humanIndicators: [],
        forensicDetails: {
          syntaxAnalysis: "N/A",
          lexicalRichness: "N/A",
          predictability: "N/A"
        },
        smartBreakdown: ["Analysis parsing failed - result uncertain"]
      };
    }

    // Normalize the result
    result.humanScore = Math.max(0, Math.min(100, Number(result.humanScore) || 50));
    
    if (!result.verdict) {
      if (result.humanScore <= 30) result.verdict = "AI Generated";
      else if (result.humanScore <= 60) result.verdict = "Uncertain";
      else result.verdict = "Likely Human";
    }

    result.aiIndicators = Array.isArray(result.aiIndicators) ? result.aiIndicators : [];
    result.humanIndicators = Array.isArray(result.humanIndicators) ? result.humanIndicators : [];
    result.smartBreakdown = Array.isArray(result.smartBreakdown) ? result.smartBreakdown : [];
    result.confidence = result.confidence || "medium";
    result.summary = result.summary || "Analysis completed.";
    
    if (!result.analysisMetadata) {
      result.analysisMetadata = {
        wordCount: analysisText.split(/\s+/).length,
        sentenceCount: analysisText.split(/[.!?]+/).length,
        perplexityLevel: "medium",
        burstinessScore: "medium"
      };
    }

    if (!result.forensicDetails) {
      result.forensicDetails = {
        syntaxAnalysis: "Standard",
        lexicalRichness: "Average",
        predictability: "Moderate"
      };
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ 
      error: `Analysis failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
