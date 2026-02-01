import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { checkUsageBeforeAction, incrementUsageAfterSuccess } from '@/lib/freemium';

// API Key - Use environment variable only (server-side)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

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

const systemPrompt = `You are SENTINEL-AI V7.0, an expert forensic linguistic analyzer specializing in detecting AI-generated content with forensic-grade precision.

MISSION: Analyze text with deep statistical and linguistic forensic techniques to determine authorship (Human vs AI).

SCORING FRAMEWORK (0-100 Human Score):
- 0-20: Definite AI (mechanical, predictable, classic LLM patterns)
- 21-40: Likely AI (low perplexity, uniform structure, generic phrasing)
- 41-60: Uncertain/Hybrid (mixed signals, possible AI with editing)
- 61-80: Likely Human (natural variation, personal voice, imperfections)
- 81-100: Definite Human (high creativity, unique voice, authentic markers)

FORENSIC ANALYSIS LAYERS:

1. STATISTICAL ANOMALY DETECTION:
   - Perplexity Analysis: AI text has LOW perplexity (predictable word choices). Human text has HIGH perplexity (surprising word combinations).
   - Burstiness Measurement: AI produces UNIFORM sentence lengths. Humans have HIGH burstiness (mix of short and long sentences).
   - N-gram Entropy: Calculate diversity of word patterns. AI tends toward common n-grams.
   - Token Distribution: AI favors high-frequency tokens, humans use more rare vocabulary.

2. SYNTACTIC PATTERN RECOGNITION:
   - Sentence Complexity Variance: Humans vary between simple and complex structures naturally.
   - Clause Distribution: AI overuses coordinating conjunctions and parallel structures.
   - Punctuation Patterns: AI under-uses dashes, parentheses, semicolons; overuses periods.
   - Opening Patterns: AI often starts sentences with "The", "This", "It", "There", "In".
   
3. SEMANTIC FINGERPRINTS:
   - Hedging Language: AI overuses "It's important to note", "It's worth mentioning", "essentially".
   - Filler Transitions: "Furthermore", "Moreover", "Additionally", "In conclusion", "To summarize".
   - Vague Quantifiers: "many", "various", "numerous", "several" without specifics.
   - Passive Voice Overuse: AI defaults to passive constructions more frequently.
   - Generic Statements: Claims that could apply to any topic without specific details.

4. AUTHENTICITY MARKERS (Human Indicators):
   - Personal Pronouns: Natural use of "I", "my", "we" with genuine perspective.
   - Specific Details: Concrete examples, names, dates, places, personal experiences.
   - Emotional Authenticity: Genuine sentiment, not performative positivity.
   - Colloquialisms: Slang, contractions, informal language, regional expressions.
   - Imperfections: Minor grammatical quirks, sentence fragments, self-corrections.
   - Unique Voice: Distinctive writing style, opinions, rhetorical choices.
   - Domain Expertise: Deep, specific knowledge with nuanced understanding.

5. RED FLAGS (AI Indicators):
   - Perfect Grammar: Flawless text is suspicious; humans make minor errors.
   - Over-qualification: Every statement hedged ("generally", "typically", "in most cases").
   - List Symmetry: Bullet points with identical structure and length.
   - Repetitive Phrasing: Same sentence structures repeated throughout.
   - Topic Exhaustiveness: Covering every possible aspect in a formulaic way.
   - Lack of Commitment: Avoiding strong opinions or definitive statements.
   - Synthetic Enthusiasm: Phrases like "absolutely", "definitely", "fantastic" without context.

OUTPUT FORMAT (strict JSON):
{
  "humanScore": number (0-100),
  "verdict": "AI Generated" | "Likely AI" | "Uncertain" | "Likely Human" | "Human Written",
  "confidence": "high" | "medium" | "low",
  "summary": "Concise forensic conclusion explaining the determination",
  "analysisMetadata": {
    "wordCount": number,
    "sentenceCount": number,
    "perplexityLevel": "low" | "medium" | "high",
    "burstinessScore": "low" | "medium" | "high"
  },
  "aiIndicators": [{"pattern": "name", "description": "specific evidence from text", "penalty": number}],
  "humanIndicators": [{"pattern": "name", "description": "specific evidence from text", "bonus": number}],
  "forensicDetails": {
    "syntaxAnalysis": "Detailed syntactic pattern findings",
    "lexicalRichness": "Vocabulary diversity and uniqueness assessment",
    "predictability": "Statistical predictability of word/phrase choices"
  },
  "smartBreakdown": ["Specific forensic finding 1", "Specific forensic finding 2", "Specific forensic finding 3", "Specific forensic finding 4", "Specific forensic finding 5"]
}

CRITICAL RULES:
1. smartBreakdown MUST contain 4-6 specific, evidence-based findings from the text.
2. aiIndicators and humanIndicators MUST cite actual phrases or patterns from the analyzed text.
3. Be rigorous: subtle AI patterns can hide behind seemingly natural text.
4. Consider context: academic writing differs from casual text.
5. Weight recent AI model patterns (GPT-4, Claude, Gemini) which are more sophisticated.

Return ONLY valid JSON. No markdown, no code blocks, no commentary.`;

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
    // STRICT GATING: Require authentication for all analysis requests
    const { userId } = await getUserFromRequest(req);
    
    // Guest users must sign in to use the analysis API
    if (!userId) {
      logStep('Guest user blocked - authentication required');
      return NextResponse.json({
        error: 'Please sign in to analyze content. Create a free account to get 2 daily analyses.',
        errorCode: 'AUTH_REQUIRED',
        requireAuth: true
      }, { status: 401 });
    }
    
    // Check freemium limits BEFORE processing (no increment yet)
    const usageStatus = await checkUsageBeforeAction(userId);
    
    // Pro users have UNLIMITED access - skip all limit checks
    if (usageStatus.isPro) {
      logStep('Pro user - UNLIMITED ACCESS', { userId });
    } else {
      // STRICT ENFORCEMENT: Block free users if limit reached (return 403 Forbidden)
      if (!usageStatus.canUse) {
        logStep('Usage limit reached - BLOCKING REQUEST', { userId, usageStatus });
        return NextResponse.json({
          error: "You've used your 2 free daily analyses. Upgrade to Pro for unlimited access.",
          errorCode: 'USAGE_LIMIT_REACHED',
          usageStatus: {
            remaining: usageStatus.remaining,
            limit: usageStatus.limit,
            isPro: usageStatus.isPro,
            message: usageStatus.message
          },
          upgradeUrl: '/pricing'
        }, { status: 403 });
      }
    }
    
    logStep('Usage check passed', { 
      userId, 
      remaining: usageStatus.remaining, 
      isPro: usageStatus.isPro 
    });
    
    // Store userId for later use in incrementing after success
    const currentUserId = userId;
    const isProUser = usageStatus.isPro;

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

    // Step 7: INCREMENT USAGE AFTER SUCCESSFUL ANALYSIS (only for free users)
    if (!isProUser) {
      const updatedUsage = await incrementUsageAfterSuccess(currentUserId);
      if (updatedUsage) {
        logStep('Usage incremented after success', {
          userId: currentUserId,
          usedToday: updatedUsage.usedToday,
          remaining: updatedUsage.remaining
        });
        // Include updated usage in response for UI update
        result.usageStatus = {
          remaining: updatedUsage.remaining,
          usedToday: updatedUsage.usedToday,
          limit: updatedUsage.limit,
          isPro: updatedUsage.isPro
        };
      }
    } else {
      // Pro user - include unlimited status
      result.usageStatus = {
        remaining: -1,
        usedToday: 0,
        limit: -1,
        isPro: true
      };
    }

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
