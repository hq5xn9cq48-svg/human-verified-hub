import { NextResponse } from "next/server";

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDI9GA_o_xoWDgHeubAT5-DeiVWSxk9uu0";

// Cost-efficient: gemini-2.5-flash as primary (cheaper, multimodal), pro as fallback
const VISION_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-exp'];

// Slightly higher temperature for creative prompt generation
const GENERATION_CONFIG = {
  temperature: 0.5,
  maxOutputTokens: 4096,
  topP: 0.9,
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
// SYSTEM PROMPT - Expert Prompt Engineering
// ============================================================================

const SYSTEM_PROMPT = `You are an expert AI prompt engineer specializing in reverse-engineering images into detailed text prompts for AI image generators (Midjourney, DALL-E, Stable Diffusion).

## ANALYSIS FRAMEWORK

1. **Subject**: Main subjects, characters, objects, their relationships
2. **Style**: Art style, photography type, illustration method, artistic influences
3. **Composition**: Layout, perspective, framing, focal points, rule of thirds
4. **Colors**: Color palette, color harmony, lighting mood, temperature
5. **Details**: Textures, materials, patterns, fine details, quality indicators
6. **Atmosphere**: Overall mood, ambiance, emotional tone, time of day
7. **Technical**: Aspect ratio hints, resolution quality, rendering style

## OUTPUT FORMAT (STRICT JSON - NO MARKDOWN)

{
  "prompt": "A comprehensive 2-4 sentence prompt that could recreate this image with an AI generator. Include subject, style, composition, lighting, colors, mood, and quality descriptors. Be vivid and specific.",
  "shortPrompt": "A concise 1-sentence version for quick use",
  "style": "The detected style (e.g., 'digital art', 'photography', 'anime', 'oil painting', 'cinematic', 'illustration')",
  "tags": ["keyword1", "keyword2", "keyword3", "...up to 10 relevant tags"],
  "negativePrompt": "What to avoid (e.g., 'blurry, low quality, distorted, watermark')"
}

CRITICAL: Return ONLY the JSON object. No markdown code blocks. No explanatory text before or after.`;

// ============================================================================
// JSON PARSING WITH MULTIPLE STRATEGIES
// ============================================================================

function parseGeminiResponse(responseText: string): Record<string, unknown> | null {
  logStep('Parsing response', { length: responseText.length });
  
  // Strategy 1: Direct parse
  try {
    return JSON.parse(responseText);
  } catch {
    logStep('Direct parse failed');
  }
  
  // Strategy 2: Clean markdown
  let cleaned = responseText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    logStep('Cleaned parse failed');
  }
  
  // Strategy 3: Regex extraction
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      logStep('Regex parse failed');
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
// GEMINI VISION API CALL
// ============================================================================

interface VisionAPIResult {
  text: string | null;
  error: string | null;
}

async function callGeminiVisionAPI(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<VisionAPIResult> {
  
  const errors: string[] = [];
  
  for (const model of VISION_MODELS) {
    try {
      logStep(`Calling model: ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

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
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
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

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `HTTP ${response.status}`;
        try {
          const errData = JSON.parse(errText);
          errMsg = errData?.error?.message || errMsg;
        } catch {}
        logError(`Model ${model} failed`, errMsg);
        errors.push(`${model}: ${errMsg}`);
        continue;
      }

      const data = await response.json();
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textContent) {
        logStep(`Success with ${model}`, { responseLength: textContent.length });
        return { text: textContent, error: null };
      }

      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        errors.push(`${model}: Content blocked by safety filters`);
        continue;
      }

      errors.push(`${model}: Empty response`);
      
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        errors.push(`${model}: Timeout (60s)`);
      } else {
        errors.push(`${model}: ${err.message}`);
      }
      continue;
    }
  }

  return { text: null, error: errors.join('; ') };
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(req: Request) {
  logStep('=== NEW IMAGE-TO-PROMPT REQUEST ===');
  
  // Validate API key
  if (!GEMINI_API_KEY) {
    logError('Configuration error', 'GEMINI_API_KEY not set');
    return NextResponse.json({ 
      error: 'Service configuration error. Please contact support.' 
    }, { status: 500 });
  }

  try {
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
        error: language === 'ar' ? 'لم يتم توفير صورة' : 'No image provided' 
      }, { status: 400 });
    }

    // Parse base64 data URI
    let base64Data: string;
    let mimeType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      const commaIndex = image.indexOf(',');
      if (commaIndex === -1) {
        return NextResponse.json({ 
          error: language === 'ar' ? 'صيغة صورة غير صالحة' : 'Invalid image format' 
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
        error: language === 'ar' ? 'بيانات الصورة غير كافية' : 'Image data too short' 
      }, { status: 400 });
    }

    // Validate size
    if (base64Data.length > 15 * 1024 * 1024) {
      return NextResponse.json({ 
        error: language === 'ar' ? 'الصورة كبيرة جداً' : 'Image too large (max 10MB)' 
      }, { status: 400 });
    }

    logStep('Image validated', { mimeType, dataLength: base64Data.length });

    // Build prompt with optional Arabic output
    const langHint = language === 'ar' 
      ? '\n\nIMPORTANT: Output all text in Arabic language.'
      : '';
    
    const prompt = `${SYSTEM_PROMPT}${langHint}\n\nAnalyze this image and generate a detailed AI prompt to recreate it:`;
    
    // Call API
    const apiResult = await callGeminiVisionAPI(prompt, base64Data, mimeType, GEMINI_API_KEY);

    if (!apiResult.text) {
      logError('API failed', apiResult.error);
      return NextResponse.json({ 
        error: language === 'ar' 
          ? 'فشل إنشاء الأمر. حاول مرة أخرى.' 
          : 'Prompt generation failed. Please try again.' 
      }, { status: 500 });
    }

    // Parse response
    let result = parseGeminiResponse(apiResult.text);
    
    if (!result) {
      logStep('Parse failed, using fallback');
      const cleanedText = apiResult.text
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();
      
      result = {
        prompt: cleanedText.substring(0, 800) || 'Unable to generate prompt',
        shortPrompt: cleanedText.substring(0, 120) || 'Parse error',
        style: 'unknown',
        tags: [],
        negativePrompt: 'blurry, low quality, distorted'
      };
    }

    // Normalize result with proper type handling
    const promptText = typeof result.prompt === 'string' ? result.prompt : 'No prompt generated';
    const shortPromptText = typeof result.shortPrompt === 'string' 
      ? result.shortPrompt 
      : promptText.substring(0, 100);
    
    const finalResult = {
      prompt: promptText,
      shortPrompt: shortPromptText,
      style: (typeof result.style === 'string' ? result.style : 'unknown'),
      tags: Array.isArray(result.tags) ? result.tags : [],
      negativePrompt: typeof result.negativePrompt === 'string' ? result.negativePrompt : 'blurry, low quality'
    };

    logStep('Generation complete', { 
      promptLength: finalResult.prompt.length, 
      style: finalResult.style 
    });
    
    return NextResponse.json(finalResult);

  } catch (error: unknown) {
    const err = error as Error;
    logError('Unhandled error', { message: err.message, stack: err.stack });
    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again.' 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 90;
