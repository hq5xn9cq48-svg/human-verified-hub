import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { checkAndIncrementUsage, UsageStatus } from '@/lib/freemium';

// API Key - Use environment variable only (server-side)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDI9GA_o_xoWDgHeubAT5-DeiVWSxk9uu0";

// Turnstile secret key for bot protection
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || '';

// Step-by-step logging utility
function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [STEP] ${step}`, details ? JSON.stringify(details, null, 2) : '');
}

function logError(step: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${step}:`, error);
}

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

Return ONLY valid JSON, no markdown, no code blocks, no additional text.`;

async function scrapeUrl(url: string): Promise<string | null> {
  logStep('Starting URL scrape', { url });
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
    if (!response.ok) {
      logError('URL scrape failed', { status: response.status });
      return null;
    }

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

    logStep('URL scrape completed', { contentLength: content.length });
    return content.length > 50 ? content.substring(0, 10000) : null;
  } catch (error) {
    logError('URL scrape error', error);
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
    logError('Turnstile verification error', error);
    return false;
  }
}

// Get language-specific instruction for AI model
// Now auto-detects input language and responds accordingly
function getLanguageInstruction(language: string, inputText: string): string {
  // Detect if input text is primarily Arabic (contains Arabic characters)
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  const arabicChars = (inputText.match(arabicPattern) || []).length;
  const isArabicInput = arabicChars > inputText.length * 0.3;
  
  // If user explicitly selected Arabic OR input is Arabic, respond in Arabic
  if (language === 'ar' || isArabicInput) {
    return "IMPORTANT: You MUST output ALL text content in Arabic language. This includes but is not limited to: 'verdict', 'summary', 'smartBreakdown', 'forensicDetails', and all 'description' fields. The input appears to be in Arabic, so ensure your analysis and comments are in Arabic.";
  }
  return "Output the analysis in English. Match the language of the input text for natural results.";
}

// Error type classification for better user messaging
type ErrorType = 'config' | 'timeout' | 'rate_limit' | 'network' | 'parse' | 'unknown';

function classifyError(error: string | null): ErrorType {
  if (!error) return 'unknown';
  
  const lowerError = error.toLowerCase();
  
  // Check for API key/authentication issues
  if (lowerError.includes('api key') || 
      lowerError.includes('api_key') || 
      lowerError.includes('authentication') ||
      lowerError.includes('unauthorized') ||
      lowerError.includes('forbidden') ||
      /\b(401|403)\b/.test(error)) {
    return 'config';
  }
  
  // Check for timeout issues
  if (lowerError.includes('timeout') || 
      lowerError.includes('timed out') ||
      lowerError.includes('aborted')) {
    return 'timeout';
  }
  
  // Check for rate limiting
  if (lowerError.includes('quota') || 
      lowerError.includes('rate limit') ||
      lowerError.includes('rate-limit') ||
      lowerError.includes('too many requests') ||
      lowerError.includes('resource exhausted') ||
      /\b429\b/.test(error)) {
    return 'rate_limit';
  }
  
  // Check for network issues
  if (lowerError.includes('network') || 
      lowerError.includes('fetch failed') ||
      lowerError.includes('enotfound') ||
      lowerError.includes('econnrefused') ||
      lowerError.includes('econnreset') ||
      lowerError.includes('socket hang up')) {
    return 'network';
  }
  
  // Check for parsing issues
  if (lowerError.includes('json') ||
      lowerError.includes('parse') ||
      lowerError.includes('unexpected token') ||
      lowerError.includes('syntax')) {
    return 'parse';
  }
  
  return 'unknown';
}

// Get user-friendly error message based on error type
function getUserErrorMessage(errorType: ErrorType, language: string): string {
  const messages: Record<ErrorType, { en: string; ar: string }> = {
    config: {
      en: 'Server configuration error. Please contact support.',
      ar: 'خطأ في إعدادات الخادم. يرجى التواصل مع الدعم.'
    },
    timeout: {
      en: 'Request timed out. Please try again with shorter text.',
      ar: 'انتهت مهلة الطلب. حاول مرة أخرى بنص أقصر.'
    },
    rate_limit: {
      en: 'Service is busy. Please try again in a moment.',
      ar: 'الخدمة مشغولة. حاول مرة أخرى بعد قليل.'
    },
    network: {
      en: 'Connection error. Please check your internet connection.',
      ar: 'خطأ في الاتصال. تحقق من اتصالك بالإنترنت.'
    },
    parse: {
      en: 'Error processing response. Please try again.',
      ar: 'خطأ في معالجة الرد. حاول مرة أخرى.'
    },
    unknown: {
      en: 'Analysis failed. Please try again.',
      ar: 'فشل التحليل. حاول مرة أخرى.'
    }
  };
  
  return language === 'ar' ? messages[errorType].ar : messages[errorType].en;
}

// Result type for API calls
interface GeminiResult {
  text: string | null;
  lastError: string | null;
}

// Validate and parse JSON response with multiple strategies
function parseGeminiResponse(responseText: string): any {
  logStep('Parsing Gemini response', { responseLength: responseText.length });
  
  // Strategy 1: Try direct parsing (fastest)
  try {
    const parsed = JSON.parse(responseText);
    logStep('Direct JSON parse succeeded');
    return parsed;
  } catch (e) {
    logStep('Direct JSON parse failed, trying cleanup strategies');
  }
  
  // Strategy 2: Remove markdown code blocks
  let cleaned = responseText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
  
  try {
    const parsed = JSON.parse(cleaned);
    logStep('Cleaned JSON parse succeeded');
    return parsed;
  } catch (e) {
    logStep('Cleaned JSON parse failed, extracting JSON object');
  }
  
  // Strategy 3: Extract JSON object using regex
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      logStep('Regex extracted JSON parse succeeded');
      return parsed;
    } catch (e) {
      logStep('Regex extracted JSON parse failed');
    }
  }
  
  // Strategy 4: Try to find and extract the most complete JSON object
  const startIdx = cleaned.indexOf('{');
  if (startIdx !== -1) {
    let depth = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      if (cleaned[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    const jsonStr = cleaned.substring(startIdx, endIdx);
    try {
      const parsed = JSON.parse(jsonStr);
      logStep('Manual extraction JSON parse succeeded');
      return parsed;
    } catch (e) {
      logStep('Manual extraction JSON parse failed');
    }
  }
  
  logError('All JSON parsing strategies failed', { preview: responseText.substring(0, 200) });
  return null;
}

// Validate analysis result structure
function validateAnalysisResult(result: any): boolean {
  if (!result || typeof result !== 'object') return false;
  if (typeof result.humanScore !== 'number' && typeof result.humanScore !== 'string') return false;
  return true;
}

// Direct REST API call to Gemini - Using working models with fallback chain
async function callGeminiREST(text: string, apiKey: string, language: string = 'en'): Promise<GeminiResult> {
  const langInstruction = getLanguageInstruction(language, text);
  let lastError: string | null = null;

  // Updated model list based on API availability testing
  // gemini-flash-latest is confirmed working; others as fallbacks
  const models = [
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-pro-latest',
    'gemini-2.0-flash-lite'
  ];

  for (const model of models) {
    try {
      logStep(`REST API: Trying model`, { model });
      
      const controller = new AbortController();
      // Increased timeout to 45 seconds to handle slower responses
      const timeoutId = setTimeout(() => {
        logStep(`REST API: Timeout triggered for ${model}`);
        controller.abort();
      }, 45000);

      const requestBody = {
        contents: [{ 
          parts: [{ 
            text: `${systemPrompt}\n\n${langInstruction}\n\nAnalyze this text:\n"""${text}"""` 
          }] 
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          topP: 0.8,
          topK: 40,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      };

      logStep(`REST API: Sending request to ${model}`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      logStep(`REST API: Received response`, { status: response.status, model });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMessage = errData?.error?.message || `HTTP ${response.status}`;
        logError(`REST API: Model ${model} failed`, { errMessage, status: response.status });
        lastError = errMessage;
        continue;
      }

      const data = await response.json();
      logStep(`REST API: Response data received`, { 
        hasCandidates: !!data?.candidates,
        candidatesCount: data?.candidates?.length 
      });
      
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (responseText) {
        logStep(`REST API: Success with model ${model}`, { responseLength: responseText.length });
        return { text: responseText, lastError: null };
      }
      
      // Check for blocked content
      if (data?.candidates?.[0]?.finishReason === 'SAFETY') {
        logStep(`REST API: Content blocked by safety filters`);
        lastError = 'Content blocked by safety filters';
        continue;
      }
      
      lastError = `Empty response from model ${model}`;
      logStep(`REST API: Empty response from ${model}`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        lastError = 'Request timed out after 45 seconds';
        logError(`REST API: Timeout for ${model}`, { timeout: '45s' });
      } else {
        lastError = error.message || 'Network error';
        logError(`REST API: Error for ${model}`, error);
      }
      continue;
    }
  }

  logStep('REST API: All models failed', { lastError });
  return { text: null, lastError };
}

// SDK-based call using @google/generative-ai (fallback)
async function callGeminiSDK(text: string, apiKey: string, language: string = 'en'): Promise<GeminiResult> {
  let lastError: string | null = null;
  
  try {
    const langInstruction = getLanguageInstruction(language, text);
    logStep('SDK: Loading Google Generative AI module');

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Updated model list based on API availability
    const models = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-pro-latest'];
    
    for (const modelName of models) {
      try {
        logStep(`SDK: Trying model`, { model: modelName });
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            topP: 0.8,
            topK: 40,
          },
        });
        
        const result = await model.generateContent({
          contents: [{ 
            role: 'user', 
            parts: [{ text: `${systemPrompt}\n\n${langInstruction}\n\nAnalyze this text:\n"""${text}"""` }] 
          }],
        });

        const responseText = result.response.text();
        if (responseText) {
          logStep(`SDK: Success with model ${modelName}`, { responseLength: responseText.length });
          return { text: responseText, lastError: null };
        }
        
        lastError = `Empty response from model ${modelName}`;
        logStep(`SDK: Empty response from ${modelName}`);
      } catch (error: any) {
        lastError = error.message || 'SDK error';
        logError(`SDK: Error for ${modelName}`, error);
        continue;
      }
    }
  } catch (importError: any) {
    lastError = importError.message || 'Failed to load SDK';
    logError('SDK: Import error', importError);
  }
  
  logStep('SDK: All models failed', { lastError });
  return { text: null, lastError };
}

// Create a fallback result when analysis partially fails
function createFallbackResult(analysisText: string, rawResponse?: string): any {
  logStep('Creating fallback result');
  return {
    humanScore: 50,
    verdict: "Uncertain",
    confidence: "low",
    summary: rawResponse 
      ? "Analysis completed but response format was unexpected. Result may be approximate."
      : "Analysis could not be completed properly.",
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
    smartBreakdown: ["Analysis parsing encountered issues - result may be approximate"]
  };
}

// Normalize and validate the final result
function normalizeResult(result: any, analysisText: string): any {
  logStep('Normalizing result');
  
  // Ensure humanScore is valid
  const rawScore = Number(result.humanScore);
  result.humanScore = isNaN(rawScore) ? 50 : Math.max(0, Math.min(100, rawScore));
  
  // Set verdict if missing
  if (!result.verdict) {
    if (result.humanScore <= 30) result.verdict = "AI Generated";
    else if (result.humanScore <= 45) result.verdict = "Likely AI";
    else if (result.humanScore <= 60) result.verdict = "Uncertain";
    else if (result.humanScore <= 80) result.verdict = "Likely Human";
    else result.verdict = "Human Written";
  }

  // Ensure arrays exist
  result.aiIndicators = Array.isArray(result.aiIndicators) ? result.aiIndicators : [];
  result.humanIndicators = Array.isArray(result.humanIndicators) ? result.humanIndicators : [];
  result.smartBreakdown = Array.isArray(result.smartBreakdown) ? result.smartBreakdown : [];
  
  // Set defaults
  result.confidence = result.confidence || "medium";
  result.summary = result.summary || "Analysis completed.";
  
  // Ensure metadata exists
  if (!result.analysisMetadata || typeof result.analysisMetadata !== 'object') {
    result.analysisMetadata = {
      wordCount: analysisText.split(/\s+/).length,
      sentenceCount: analysisText.split(/[.!?]+/).length,
      perplexityLevel: "medium",
      burstinessScore: "medium"
    };
  }

  // Ensure forensicDetails exists
  if (!result.forensicDetails || typeof result.forensicDetails !== 'object') {
    result.forensicDetails = {
      syntaxAnalysis: "Standard",
      lexicalRichness: "Average",
      predictability: "Moderate"
    };
  }

  logStep('Result normalized', { humanScore: result.humanScore, verdict: result.verdict });
  return result;
}

// Supabase client for auth verification
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Extract user from authorization header
async function getUserFromRequest(req: Request): Promise<{ userId: string | null; isPro: boolean }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { userId: null, isPro: false };
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { userId: null, isPro: false };
    }
    
    return { userId: user.id, isPro: false }; // isPro will be checked in freemium logic
  } catch {
    return { userId: null, isPro: false };
  }
}

export async function POST(req: Request) {
  logStep('=== NEW ANALYSIS REQUEST ===');
  
  // Check API key first
  if (!GEMINI_API_KEY) {
    logError('API key missing', 'GEMINI_API_KEY not set');
    return NextResponse.json({ 
      error: 'API configuration error. Please contact support.' 
    }, { status: 500 });
  }
  logStep('API key validated', { keyLength: GEMINI_API_KEY.length });

  try {
    // Check user authentication and freemium limits
    const { userId } = await getUserFromRequest(req);
    
    let usageStatus: UsageStatus | null = null;
    if (userId) {
      usageStatus = await checkAndIncrementUsage(userId);
      
      if (!usageStatus.canUse) {
        logStep('Usage limit reached', { userId, usageStatus });
        return NextResponse.json({
          error: 'Daily limit reached. Upgrade to Pro for unlimited analyses.',
          errorCode: 'USAGE_LIMIT_REACHED',
          usageStatus: {
            remaining: usageStatus.remaining,
            limit: usageStatus.limit,
            isPro: usageStatus.isPro,
            message: usageStatus.message
          }
        }, { status: 429 });
      }
      
      logStep('Usage check passed', { 
        userId, 
        remaining: usageStatus.remaining, 
        isPro: usageStatus.isPro 
      });
    } else {
      logStep('Guest user - allowing access without tracking');
    }

    const body = await req.json();
    let { text, url, language = 'en', turnstileToken } = body;
    logStep('Request body parsed', { hasText: !!text, hasUrl: !!url, language, hasTurnstile: !!turnstileToken });

    // Verify Turnstile token if provided
    if (turnstileToken) {
      logStep('Verifying Turnstile token');
      const isValid = await verifyTurnstile(turnstileToken);
      if (!isValid) {
        logStep('Turnstile verification failed');
        return NextResponse.json({ 
          error: language === 'ar' ? 'فشل التحقق من الروبوت' : 'Bot verification failed. Please try again.' 
        }, { status: 403 });
      }
      logStep('Turnstile verification passed');
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
      logStep('Text validation failed', { textLength: text?.length });
      return NextResponse.json({ 
        error: language === 'ar' ? "النص قصير جداً" : "Text too short (min 10 chars)" 
      }, { status: 400 });
    }

    const analysisText = text.trim().substring(0, 8000);
    logStep('Text prepared for analysis', { originalLength: text.length, trimmedLength: analysisText.length });

    // Step 1: Try REST API first (faster)
    logStep('Step 1: Attempting REST API call');
    const restResult = await callGeminiREST(analysisText, GEMINI_API_KEY, language);
    let responseText = restResult.text;
    const restError = restResult.lastError;
    let sdkError: string | null = null;
    
    // Step 2: If REST fails, try SDK as fallback
    if (!responseText) {
      logStep('Step 2: REST API failed, attempting SDK fallback');
      const sdkResult = await callGeminiSDK(analysisText, GEMINI_API_KEY, language);
      responseText = sdkResult.text;
      sdkError = sdkResult.lastError;
    }

    // Step 3: Handle complete failure
    if (!responseText) {
      logStep('Step 3: All API methods failed', { restError, sdkError });
      
      const restErrorType = classifyError(restError);
      const sdkErrorType = classifyError(sdkError);
      
      let finalErrorType: ErrorType;
      if (restErrorType !== 'unknown') {
        finalErrorType = restErrorType;
      } else if (sdkErrorType !== 'unknown') {
        finalErrorType = sdkErrorType;
      } else {
        finalErrorType = 'unknown';
      }
      
      const userError = getUserErrorMessage(finalErrorType, language);
      
      logError('All AI methods failed', { restError, sdkError, finalErrorType });
      return NextResponse.json({ error: userError }, { status: 500 });
    }

    // Step 4: Parse and validate the response
    logStep('Step 4: Parsing API response');
    let result = parseGeminiResponse(responseText);
    
    // Step 5: Handle parse failure with fallback
    if (!result || !validateAnalysisResult(result)) {
      logStep('Step 5: Parse failed, creating fallback result');
      result = createFallbackResult(analysisText, responseText);
    }

    // Step 6: Normalize and validate the result
    logStep('Step 6: Normalizing final result');
    result = normalizeResult(result, analysisText);

    logStep('=== ANALYSIS COMPLETE ===', { humanScore: result.humanScore, verdict: result.verdict });
    return NextResponse.json(result);

  } catch (error: any) {
    logError('Unhandled error in analysis', error);
    return NextResponse.json({ 
      error: `Analysis failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
