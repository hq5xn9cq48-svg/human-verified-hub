import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { checkAndIncrementUsage, UsageStatus } from '@/lib/freemium';

// ============================================================================
// CONFIGURATION - STABILITY FIRST
// ============================================================================

// API Key from environment variable (Vercel config)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// MANDATORY: gemini-1.5-flash as primary for cost efficiency
// Using same proven model pattern as Text Analysis API
const VISION_MODELS = [
  'gemini-1.5-flash',      // Primary - cost efficient, proven working
  'gemini-flash-latest',   // Fallback 1 - confirmed working in text analysis
  'gemini-1.5-pro'         // Fallback 2 - higher quality if flash fails
];

// Low temperature (0.3) for precise prompt generation with slight creativity
const GENERATION_CONFIG = {
  temperature: 0.3,
  maxOutputTokens: 2048,
  topP: 0.85,
  topK: 40
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

function logStep(step: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [IMAGE-TO-PROMPT] ${step}`, details ? JSON.stringify(details) : '');
}

function logError(step: string, error: unknown) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [IMAGE-TO-PROMPT ERROR] ${step}:`, error);
}

// ============================================================================
// HIGH-PRECISION SYSTEM PROMPT - Expert Prompt Engineering
// Designed to force gemini-1.5-flash to generate detailed, accurate prompts
// ============================================================================

const SYSTEM_PROMPT = `You are PROMPT-ENGINEER V5.0, an expert at reverse-engineering images into detailed AI generation prompts. Your prompts must be precise enough to recreate the image with Midjourney, DALL-E, or Stable Diffusion.

## YOUR MISSION
Analyze the provided image and generate a comprehensive text prompt that could recreate it. Be specific about every visual element.

## ANALYSIS FRAMEWORK (Apply ALL)

### 1. SUBJECT ANALYSIS
- Main subjects, characters, objects
- Poses, expressions, actions
- Relationships between elements
- Foreground vs background placement

### 2. STYLE IDENTIFICATION
- Art style: photography, digital art, anime, oil painting, illustration, 3D render, etc.
- Artistic influences or resemblances
- Era or period aesthetics
- Quality level: professional, amateur, artistic, commercial

### 3. COMPOSITION
- Layout and framing (close-up, wide shot, portrait, landscape)
- Perspective and camera angle
- Rule of thirds application
- Focal points and visual hierarchy

### 4. LIGHTING & COLOR
- Light source direction and type (natural, studio, dramatic)
- Color palette (warm, cool, vibrant, muted)
- Mood created by lighting
- Shadows and highlights

### 5. TECHNICAL DETAILS
- Resolution quality indicators
- Rendering style
- Texture details
- Special effects or filters

## OUTPUT FORMAT (STRICT JSON ONLY)

{
  "prompt": "A comprehensive 2-4 sentence prompt that captures all visual elements. Include: subject description, style, composition, lighting, colors, mood, and quality modifiers. Be vivid and specific.",
  "shortPrompt": "A concise 1-sentence version capturing the essence for quick use.",
  "style": "The primary detected style (photography | digital art | anime | illustration | oil painting | watercolor | 3D render | cinematic | concept art | other)",
  "tags": ["keyword1", "keyword2", "up to 10 relevant tags for searchability"],
  "negativePrompt": "What to avoid in recreation (e.g., blurry, low quality, distorted, watermark, text)"
}

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks, no extra text
2. Be extremely specific - mention exact colors, positions, expressions
3. Include quality modifiers (8k, detailed, professional, etc.) in the prompt
4. Tags should be searchable keywords that describe the image
5. Negative prompt should list common AI generation artifacts to avoid`;

// ============================================================================
// JSON PARSING - Multiple strategies for robustness
// ============================================================================

function parseGeminiResponse(responseText: string): Record<string, unknown> | null {
  logStep('Parsing response', { length: responseText.length });
  
  // Strategy 1: Direct JSON parse
  try {
    return JSON.parse(responseText);
  } catch {
    logStep('Direct parse failed');
  }
  
  // Strategy 2: Clean markdown and parse
  let cleaned = responseText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    logStep('Cleaned parse failed');
  }
  
  // Strategy 3: Extract JSON object with regex
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      logStep('Regex extraction failed');
    }
  }
  
  // Strategy 4: Manual bracket matching
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
    try {
      return JSON.parse(cleaned.substring(startIdx, endIdx));
    } catch {
      logStep('Manual extraction failed');
    }
  }
  
  logError('All parsing strategies failed', { preview: responseText.substring(0, 200) });
  return null;
}

// ============================================================================
// GEMINI VISION API CALL - Following Text Analysis pattern
// ============================================================================

interface VisionAPIResult {
  text: string | null;
  error: string | null;
  modelUsed?: string;
}

async function callGeminiVisionAPI(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<VisionAPIResult> {
  
  for (const model of VISION_MODELS) {
    try {
      logStep(`Trying model: ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        logStep(`Timeout triggered for ${model}`);
        controller.abort();
      }, 45000); // 45s timeout - same as Text Analysis

      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            { 
              inlineData: { 
                mimeType: mimeType,
                data: imageBase64
              }
            }
          ]
        }],
        generationConfig: GENERATION_CONFIG,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      };

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
      logStep(`Response received`, { status: response.status, model });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${response.status}`;
        logError(`Model ${model} failed`, { status: response.status, message: errMsg });
        continue; // Try next model
      }

      const data = await response.json();
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textContent) {
        logStep(`Success with ${model}`, { responseLength: textContent.length });
        return { text: textContent, error: null, modelUsed: model };
      }

      // Check for safety block
      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        logStep(`Safety block on ${model}`);
        continue;
      }

      logStep(`Empty response from ${model}`, { finishReason });
      
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        logError(`Timeout on ${model}`, '45 seconds exceeded');
      } else {
        logError(`Error on ${model}`, err.message);
      }
      continue; // Try next model
    }
  }

  return { text: null, error: 'All vision models failed' };
}

// ============================================================================
// AUTH & FREEMIUM
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(req: Request) {
  logStep('=== NEW IMAGE-TO-PROMPT REQUEST ===');
  
  // Validate API key from environment
  if (!GEMINI_API_KEY) {
    logError('Configuration error', 'GEMINI_API_KEY not set in environment');
    return NextResponse.json({ 
      error: 'Service temporarily unavailable. Please try again later.',
      errorCode: 'API_CONFIG_ERROR'
    }, { status: 503 });
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
    const { image, language = 'en' } = body;
    
    logStep('Request received', { 
      hasImage: !!image, 
      imageType: typeof image, 
      language 
    });

    // Validate image presence
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ 
        error: language === 'ar' ? 'لم يتم توفير صورة' : 'No image provided',
        errorCode: 'NO_IMAGE'
      }, { status: 400 });
    }

    // Parse base64 data URI
    let base64Data: string;
    let mimeType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      const commaIndex = image.indexOf(',');
      if (commaIndex === -1) {
        return NextResponse.json({ 
          error: language === 'ar' ? 'صيغة صورة غير صالحة' : 'Invalid image format',
          errorCode: 'INVALID_FORMAT'
        }, { status: 400 });
      }
      
      const header = image.substring(0, commaIndex);
      base64Data = image.substring(commaIndex + 1);
      
      const mimeMatch = header.match(/data:([^;,]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    } else {
      base64Data = image;
    }

    // Validate base64 data
    if (!base64Data || base64Data.length < 100) {
      return NextResponse.json({ 
        error: language === 'ar' ? 'بيانات الصورة غير كافية' : 'Image data too short',
        errorCode: 'INVALID_DATA'
      }, { status: 400 });
    }

    // Validate size (base64 is ~33% larger than binary)
    const estimatedBytes = (base64Data.length * 3) / 4;
    const maxBytes = 15 * 1024 * 1024;
    
    if (estimatedBytes > maxBytes) {
      return NextResponse.json({ 
        error: language === 'ar' ? 'الصورة كبيرة جداً (الحد الأقصى 10 ميجابايت)' : 'Image too large (max 10MB)',
        errorCode: 'FILE_TOO_LARGE'
      }, { status: 400 });
    }

    logStep('Image validated', { mimeType, sizeMB: (estimatedBytes / 1024 / 1024).toFixed(2) });

    // Build prompt with language hint
    const langHint = language === 'ar' 
      ? '\n\nIMPORTANT: Output all text fields in Arabic language.'
      : '';
    
    const prompt = `${SYSTEM_PROMPT}${langHint}\n\nAnalyze this image and generate a detailed AI prompt to recreate it. Be specific:`;
    
    // Call Gemini Vision API
    const apiResult = await callGeminiVisionAPI(prompt, base64Data, mimeType, GEMINI_API_KEY);

    if (!apiResult.text) {
      logError('All API calls failed', apiResult.error);
      return NextResponse.json({ 
        error: language === 'ar' 
          ? 'فشل إنشاء الوصف. حاول مرة أخرى.' 
          : 'Prompt generation failed. Please try again.',
        errorCode: 'GENERATION_FAILED'
      }, { status: 500 });
    }

    // Parse response
    let result = parseGeminiResponse(apiResult.text);
    
    // Fallback if parsing fails
    if (!result) {
      logStep('Parse failed, creating fallback from raw text');
      const cleanedText = apiResult.text
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();
      
      result = {
        prompt: cleanedText.substring(0, 800) || 'Unable to generate prompt from this image.',
        shortPrompt: cleanedText.substring(0, 150) || 'Image analysis completed.',
        style: 'unknown',
        tags: ['image', 'generated'],
        negativePrompt: 'blurry, low quality, distorted, watermark'
      };
    }

    // Normalize result with proper type handling
    const promptText = typeof result.prompt === 'string' && result.prompt.length > 0 
      ? result.prompt 
      : 'No detailed prompt could be generated.';
    
    const shortPromptText = typeof result.shortPrompt === 'string' && result.shortPrompt.length > 0
      ? result.shortPrompt 
      : promptText.substring(0, 150);
    
    const finalResult = {
      prompt: promptText,
      shortPrompt: shortPromptText,
      style: typeof result.style === 'string' ? result.style : 'unknown',
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 10) : [],
      negativePrompt: typeof result.negativePrompt === 'string' 
        ? result.negativePrompt 
        : 'blurry, low quality, distorted, watermark',
      modelUsed: apiResult.modelUsed
    };

    logStep('=== GENERATION COMPLETE ===', { 
      promptLength: finalResult.prompt.length, 
      style: finalResult.style,
      model: finalResult.modelUsed
    });
    
    return NextResponse.json(finalResult);

  } catch (error: unknown) {
    const err = error as Error;
    logError('Unhandled error', { message: err.message, stack: err.stack });
    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again.',
      errorCode: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
