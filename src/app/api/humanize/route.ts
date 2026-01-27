import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { checkAndIncrementUsage, UsageStatus, getFeatureLockedResponse } from '@/lib/freemium';

// API Key - Use environment variable only (server-side)
// SECURITY: Never expose this key in client-side code
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Validate API key is configured
function validateApiKey(): boolean {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
    console.error('[SECURITY] GEMINI_API_KEY is not configured in environment variables');
    return false;
  }
  return true;
}

// Supabase client for auth verification
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Extract user from authorization header
async function getUserFromRequest(req: Request): Promise<{ userId: string | null }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { userId: null };
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { userId: null };
    }
    
    return { userId: user.id };
  } catch {
    return { userId: null };
  }
}

// Step-by-step logging utility
function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [HUMANIZE] ${step}`, details ? JSON.stringify(details, null, 2) : '');
}

function logError(step: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [HUMANIZE ERROR] ${step}:`, error);
}

const systemPrompt = `You are HUMANIZER V5.0, an advanced text transformation expert specializing in making AI-generated text undetectable.

## FORENSIC EVASION PRINCIPLES
Modern AI detectors analyze:
1. BURSTINESS: AI has uniform sentence lengths. ADD VARIANCE.
2. PERPLEXITY: AI uses predictable phrases. ADD UNEXPECTED WORD CHOICES.
3. SYNTHETIC PATTERNS: AI loves transitions. ELIMINATE THEM.

## MANDATORY TRANSFORMATIONS

### ELIMINATE AI FINGERPRINTS (Do ALL of these):
- Remove ALL transition phrases: "Furthermore", "Moreover", "Additionally", "In conclusion", "It's important to note", "It's worth mentioning"
- Break perfect parallel structures
- Replace generic superlatives with specific descriptors
- Convert numbered lists to flowing prose
- Add contractions (can't, won't, doesn't, it's)
- Remove hedging phrases like "generally", "typically", "usually"

### ADD HUMAN MARKERS:
- Vary sentence lengths DRAMATICALLY (4 words, then 28, then 11)
- Add occasional asides (parenthetical comments)
- Include conversational interjections (Well, Actually, Look, Honestly)
- Use specific references instead of generic ones
- Add minor "imperfections" that humans naturally make
- Use idiomatic expressions appropriate to the language

### PRESERVE ABSOLUTELY:
- Original meaning (100% semantic fidelity)
- Language and dialect (Arabic Fusha, Egyptian dialect, Gulf, Levantine, English, etc.)
- Technical accuracy for specialized content
- Proper nouns and specific references

## STYLE PRESETS
- default: Natural, conversational, high burstiness
- academic: Scholarly but with varied structure, occasional personal voice
- casual: Very relaxed, fragments allowed, high colloquialism
- business: Direct, confident, minimal fluff
- creative: Vivid imagery, sensory language, unexpected word choices
- undetectable: MAXIMUM transformation - prioritize detector evasion while preserving meaning

## OUTPUT RULES
1. Return ONLY the transformed text
2. No explanations, no metadata, no quotes around the text
3. The output must pass AI detection tools`;


// Updated model list - using working models
const MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-pro-latest',
  'gemini-2.0-flash-lite'
];

async function callGeminiAPI(prompt: string, apiKey: string): Promise<{ text: string | null; error: string | null }> {
  for (const model of MODELS) {
    try {
      logStep(`Trying model: ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 4096,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMessage = errData?.error?.message || `HTTP ${response.status}`;
        logError(`Model ${model} failed`, errMessage);
        continue;
      }

      const data = await response.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (responseText) {
        logStep(`Success with model: ${model}`);
        return { text: responseText, error: null };
      }
      
      logStep(`Empty response from ${model}`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logError(`Timeout for ${model}`, 'Request timed out');
      } else {
        logError(`Error for ${model}`, error.message);
      }
      continue;
    }
  }

  return { text: null, error: 'All models failed' };
}

export async function POST(req: Request) {
  logStep('=== NEW HUMANIZE REQUEST ===');
  
  // Check API key first
  if (!GEMINI_API_KEY) {
    logError('API key missing', 'GEMINI_API_KEY not set');
    return NextResponse.json({ 
      error: 'API configuration error. Please contact support.' 
    }, { status: 500 });
  }

  try {
    // Parse body early to get language for error messages
    const body = await req.json();
    const { text, intent = 'default', language = 'en' } = body;
    
    // Check user authentication and freemium limits
    const { userId } = await getUserFromRequest(req);
    
    // STRICT GATE: Humanizer is PRO-ONLY feature
    let usageStatus: UsageStatus | null = null;
    if (userId) {
      // Check with feature-specific gate
      usageStatus = await checkAndIncrementUsage(userId, 'humanizer');
      
      // Check if feature is locked (non-Pro trying to access Pro feature)
      if (!usageStatus.isPro) {
        logStep('Feature locked for non-Pro user', { userId, feature: 'humanizer' });
        const lockedResponse = getFeatureLockedResponse('humanizer', language);
        return NextResponse.json(lockedResponse, { status: 403 });
      }
      
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
      // STRICT: Guest users cannot use Pro features
      logStep('Guest user blocked from Pro feature: humanizer');
      const lockedResponse = getFeatureLockedResponse('humanizer', language);
      return NextResponse.json({
        ...lockedResponse,
        error: language === 'ar' 
          ? 'يرجى تسجيل الدخول والترقية للوصول إلى المحول البشري.'
          : 'Please sign in and upgrade to Pro to access the Humanizer.'
      }, { status: 403 });
    }
    logStep('Request received', { textLength: text?.length, intent, language });

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json({ 
        error: language === 'ar' ? "النص قصير جداً (20 حرف على الأقل)" : "Text too short (min 20 chars)" 
      }, { status: 400 });
    }

    const processText = text.trim().substring(0, 8000);

    const styleInstructions: Record<string, string> = {
      default: "Apply natural humanization.",
      academic: "Keep scholarly tone but add human variation.",
      casual: "Make it very conversational and relaxed.",
      business: "Professional but personable and direct.",
      creative: "Add vivid imagery and artistic flair.",
      marketing: "Make it engaging and persuasive.",
      undetectable: "MAXIMUM humanization to bypass AI detectors."
    };

    const prompt = `${systemPrompt}\n\nStyle: ${intent.toUpperCase()}\n${styleInstructions[intent] || styleInstructions.default}\n\nText to humanize:\n"""${processText}"""\n\nReturn ONLY the humanized text:`;

    const result = await callGeminiAPI(prompt, GEMINI_API_KEY);

    if (!result.text) {
      logError('All API methods failed', result.error);
      return NextResponse.json({ 
        error: language === 'ar' ? "فشل التحويل. حاول مرة أخرى." : "Humanization failed. Please try again." 
      }, { status: 500 });
    }

    // Clean unwanted prefixes
    let cleaned = result.text.trim();
    const prefixes = ["Here is", "Here's", "Humanized:", "إليك", "النص المحسن:"];
    for (const p of prefixes) {
      if (cleaned.toLowerCase().startsWith(p.toLowerCase())) {
        cleaned = cleaned.substring(p.length).trim();
      }
    }

    logStep('Humanization complete', { outputLength: cleaned.length });
    return NextResponse.json({ humanizedText: cleaned });

  } catch (error: any) {
    logError("Unhandled error", error);
    return NextResponse.json({ 
      error: `Humanization failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
