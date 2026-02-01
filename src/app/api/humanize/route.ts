import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { isUserPro } from '@/lib/freemium';

// Use environment variable (server-side only). Must be configured.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

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

const systemPrompt = `You are an expert text humanizer. Your job is to make AI-generated text sound more natural and human-like.

CRITICAL RULES:
1. PRESERVE the original meaning 100%
2. DETECT and KEEP the original language/dialect (Arabic Fusha, Egyptian, Gulf, English, etc.)
3. DO NOT convert any dialect to another
4. ONLY modify style and structure

HUMANIZATION TECHNIQUES:
- Vary sentence lengths (mix short, medium, long)
- Add natural speech patterns
- Remove AI phrases: "Furthermore", "Moreover", "In conclusion", "It's worth noting"
- Add minor imperfections where natural
- Use contractions in English
- Add conversational markers

STYLES:
- default: Natural, balanced
- academic: Scholarly but varied
- casual: Relaxed, conversational  
- business: Professional, direct
- creative: Vivid, artistic
- marketing: Engaging, persuasive
- undetectable: Maximum humanization

OUTPUT: Return ONLY the humanized text, nothing else.`;

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
    // STRICT GATING: Require authentication for humanizer (Pro feature)
    const { userId } = await getUserFromRequest(req);
    
    // Guest users must sign in
    if (!userId) {
      logStep('Guest user blocked - authentication required');
      return NextResponse.json({
        error: 'Please sign in to use the humanizer. Create a free account to get started.',
        errorCode: 'AUTH_REQUIRED',
        requireAuth: true
      }, { status: 401 });
    }
    
    // Check if user is Pro (humanizer is a Pro-only feature)
    const isPro = await isUserPro(userId);
    
    if (!isPro) {
      logStep('Free user blocked - Pro feature', { userId });
      return NextResponse.json({
        error: 'Text humanizer is a Pro feature. Upgrade to Pro for unlimited access.',
        errorCode: 'PRO_REQUIRED',
        upgradeUrl: '/pricing'
      }, { status: 403 });
    }
    
    logStep('Pro user authorized', { userId });

    const body = await req.json();
    const { text, intent = 'default', language = 'en' } = body;
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
