import { NextResponse } from "next/server";
import * as cheerio from 'cheerio';

// API Key - Use environment variable with fallback
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

// Turnstile secret key for bot protection
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || '';

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

// Verify Turnstile token
async function verifyTurnstile(token: string): Promise<boolean> {
  if (!token) return false;
  
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${TURNSTILE_SECRET}&response=${token}`,
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

// Get language-specific instruction for AI model
function getLanguageInstruction(language: string): string {
  if (language === 'ar') {
    return "IMPORTANT: You MUST output ALL text content in Arabic language. This includes but is not limited to: 'verdict', 'summary', 'smartBreakdown', 'forensicDetails', and all 'description' fields.";
  }
  return "Output the analysis in English.";
}

// Direct REST API call to Gemini
async function callGeminiREST(text: string, apiKey: string, language: string = 'en'): Promise<string | null> {
  const langInstruction = getLanguageInstruction(language);

  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest', 
    'gemini-1.5-pro',
    'gemini-pro'
  ];

  for (const model of models) {
    try {
      console.log(`[REST] Trying model: ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `${systemPrompt}\n\n${langInstruction}\n\nAnalyze this text:\n"""${text}"""` 
              }] 
            }],
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
        console.error(`[REST] Model ${model} failed:`, errData?.error?.message || response.status);
        continue;
      }

      const data = await response.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (responseText) {
        console.log(`[REST] Success with model: ${model}`);
        return responseText;
      }
    } catch (error: any) {
      console.error(`[REST] Model ${model} error:`, error.message);
      continue;
    }
  }

  return null;
}

// SDK-based call using @google/generative-ai
async function callGeminiSDK(text: string, apiKey: string, language: string = 'en'): Promise<string | null> {
  try {
    const langInstruction = getLanguageInstruction(language);

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    
    for (const modelName of models) {
      try {
        console.log(`[SDK] Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent({
          contents: [{ 
            role: 'user', 
            parts: [{ text: `${systemPrompt}\n\n${langInstruction}\n\nAnalyze this text:\n"""${text}"""` }] 
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            topP: 0.8,
            topK: 40,
          },
        });

        const responseText = result.response.text();
        if (responseText) {
          console.log(`[SDK] Success with model: ${modelName}`);
          return responseText;
        }
      } catch (error: any) {
        console.error(`[SDK] Model ${modelName} error:`, error.message);
        continue;
      }
    }
  } catch (importError) {
    console.error('[SDK] Import error:', importError);
  }
  
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { text, url, language = 'en', turnstileToken } = body;

    // Verify Turnstile token if provided
    if (turnstileToken) {
      const isValid = await verifyTurnstile(turnstileToken);
      if (!isValid) {
        return NextResponse.json({ 
          error: language === 'ar' ? 'فشل التحقق من الروبوت' : 'Bot verification failed. Please try again.' 
        }, { status: 403 });
      }
    }

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

    // Try REST API first, then SDK as fallback
    let responseText = await callGeminiREST(analysisText, GEMINI_API_KEY, language);
    
    if (!responseText) {
      console.log('REST API failed, trying SDK...');
      responseText = await callGeminiSDK(analysisText, GEMINI_API_KEY, language);
    }

    // If all methods failed
    if (!responseText) {
      return NextResponse.json({ 
        error: language === 'ar' ? 'فشل التحليل - حاول مرة أخرى' : 'Analysis failed. Please try again in a moment.' 
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
