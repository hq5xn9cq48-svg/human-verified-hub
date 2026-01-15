import { NextResponse } from "next/server";

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDI9GA_o_xoWDgHeubAT5-DeiVWSxk9uu0";

// Cost-efficient model selection: gemini-2.5-flash as primary (cheaper, multimodal)
// Fallback to 2.5-pro or 2.0-flash-exp if flash fails
const VISION_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-exp'];

// Low temperature for precise, forensic-level analysis
const GENERATION_CONFIG = {
  temperature: 0.2,      // Low temperature = more precise/factual
  maxOutputTokens: 8192,
  topP: 0.8,
  topK: 40
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

function logStep(step: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [IMAGE-ANALYZE] ${step}`, details ? JSON.stringify(details) : '');
}

function logError(step: string, error: unknown) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [IMAGE-ANALYZE ERROR] ${step}:`, error);
}

// ============================================================================
// SYSTEM PROMPT - Forensic-Level AI Image Detection
// ============================================================================

const SYSTEM_PROMPT = `You are an expert AI image forensics analyst with advanced training in detecting AI-generated images. Your analysis must be precise, methodical, and evidence-based.

## DETECTION METHODOLOGY

### 1. ANATOMICAL ANALYSIS (Critical for portraits)
- **Hands**: Count fingers precisely (AI often generates 4, 6, or malformed fingers), verify joint articulation, nail consistency, proportions
- **Eyes**: Check iris pattern uniqueness, reflection consistency, pupil alignment, catchlight symmetry
- **Teeth**: Look for uniform size anomalies, impossible dental structures, missing natural gaps
- **Ears**: Verify asymmetry consistency, lobe attachment logic
- **Skin**: Detect "waxy" or "plastic" textures, unnatural pore patterns, illogical wrinkles

### 2. TEXTURE & SURFACE ANALYSIS
- **Hair**: Individual strand visibility vs. painted mass appearance, hairline logic
- **Fabric**: Pattern consistency, weave logic, fold physics, material rendering
- **Backgrounds**: Edge warping, impossible architecture, blending artifacts, repeating patterns
- **Text/Signs**: Gibberish letters, font inconsistencies, warped characters

### 3. PHYSICS & LIGHTING CONSISTENCY
- **Shadows**: Direction consistency across all objects, soft vs. hard shadow logic
- **Reflections**: Surface accuracy, eye reflection matching environment
- **Perspective**: Vanishing point consistency, scale proportions
- **Depth of Field**: Natural bokeh vs. artificial blur patterns

### 4. AI MODEL FINGERPRINTS
- **Repetitive patterns**: Tiling artifacts, clone stamps, texture repetition
- **Edge artifacts**: Halo effects, unnatural transitions, boundary bleeding
- **Color banding**: Gradient stepping in smooth gradient areas
- **Micro-artifacts**: Pixel-level noise patterns inconsistent with camera sensors

## SCORING GUIDELINES (Be precise)

- **0-20%**: Strong authentic indicators (natural imperfections, consistent physics, no anomalies)
- **21-40%**: Likely authentic with minor uncertainty (compression could cause minor artifacts)
- **41-60%**: Uncertain (mixed signals, could be heavily edited OR AI generated)
- **61-80%**: Likely AI Generated (clear artifacts or anatomical issues, multiple AI fingerprints)
- **81-100%**: Confirmed AI Generation (multiple critical anomalies, clear model signatures)

## AI MODEL IDENTIFICATION (if >60% probability)
- **DALL-E 3**: Photorealistic, sometimes "too perfect", characteristic soft lighting
- **Midjourney v6**: Artistic quality, strong composition, distinctive color grading
- **Stable Diffusion XL**: Variable quality, sometimes softer details, specific texture patterns
- **Firefly/Adobe**: Clean commercial aesthetic, stock photo quality
- **Flux**: High photorealism, uncanny valley effect common

## OUTPUT FORMAT (STRICT JSON - NO MARKDOWN)

{
  "aiProbability": <integer 0-100>,
  "verdict": "<Authentic Photo | Likely Authentic | Uncertain | Likely AI | AI Generated>",
  "confidenceLevel": "<high | medium | low>",
  "summary": "<2-3 sentence forensic summary>",
  "likelyModel": "<Model name if AI detected, null if authentic>",
  "artifacts": [
    {
      "name": "<artifact name>",
      "category": "<anatomical | texture | physics | artifact>",
      "severity": "<critical | high | medium | low>",
      "location": "<specific location in image>",
      "description": "<detailed evidence description>"
    }
  ],
  "analysisDetails": {
    "handAnalysis": "<findings or 'N/A - No hands visible'>",
    "eyeAnalysis": "<findings or 'N/A - No eyes visible'>",
    "textureAnalysis": "<skin, hair, fabric findings>",
    "lightingAnalysis": "<shadow and lighting consistency>",
    "backgroundAnalysis": "<background elements analysis>"
  },
  "recommendations": "<verification tips for user>"
}

CRITICAL: Return ONLY the JSON object. No markdown code blocks. No explanatory text.`;

// ============================================================================
// JSON PARSING WITH MULTIPLE STRATEGIES
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
  
  logError('All parsing strategies failed', { preview: responseText.substring(0, 300) });
  return null;
}

// ============================================================================
// GEMINI VISION API CALL
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
      logStep(`Calling model: ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
        logError(`Model ${model} failed`, { status: response.status, message: errorMsg });
        continue;
      }

      const data = await response.json();
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textContent) {
        logStep(`Success with ${model}`, { responseLength: textContent.length });
        return { text: textContent, error: null, modelUsed: model };
      }

      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        logStep(`Safety block on ${model}`);
        continue;
      }

      logStep(`Empty response from ${model}`, { finishReason });
      
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        logError(`Timeout on ${model}`, 'Request exceeded 90 seconds');
      } else {
        logError(`Error on ${model}`, err.message);
      }
      continue;
    }
  }

  return { text: null, error: 'All vision models failed to process the image' };
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(req: Request) {
  logStep('=== NEW IMAGE ANALYSIS REQUEST ===');
  
  // Validate API key
  if (!GEMINI_API_KEY) {
    logError('Configuration error', 'GEMINI_API_KEY not set');
    return NextResponse.json({ 
      error: 'Service temporarily unavailable. Please try again later.',
      errorCode: 'API_CONFIG_ERROR'
    }, { status: 503 });
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
        error: language === 'ar' ? 'لم يتم توفير صورة' : 'No image provided',
        errorCode: 'NO_IMAGE'
      }, { status: 400 });
    }

    // Parse base64 data URI
    let base64Data: string;
    let mimeType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ 
          error: language === 'ar' ? 'صيغة صورة غير صالحة' : 'Invalid image format',
          errorCode: 'INVALID_FORMAT'
        }, { status: 400 });
      }
      mimeType = match[1];
      base64Data = match[2];
    } else {
      base64Data = image;
    }

    // Validate MIME type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(mimeType)) {
      return NextResponse.json({ 
        error: language === 'ar' ? 'صيغة صورة غير مدعومة' : `Unsupported format: ${mimeType}`,
        errorCode: 'UNSUPPORTED_FORMAT'
      }, { status: 400 });
    }

    // Validate size (base64 is ~33% larger than binary)
    const estimatedBytes = (base64Data.length * 3) / 4;
    const maxBytes = 15 * 1024 * 1024;
    
    if (estimatedBytes > maxBytes) {
      return NextResponse.json({ 
        error: language === 'ar' ? 'الصورة كبيرة جداً' : 'Image too large (max 15MB)',
        errorCode: 'FILE_TOO_LARGE'
      }, { status: 400 });
    }

    logStep('Image validated', { 
      mimeType, 
      sizeMB: (estimatedBytes / 1024 / 1024).toFixed(2) 
    });

    // Call Gemini Vision API
    const prompt = `${SYSTEM_PROMPT}\n\nAnalyze this image thoroughly for AI generation indicators:`;
    const apiResult = await callGeminiVisionAPI(prompt, base64Data, mimeType, GEMINI_API_KEY);

    if (!apiResult.text) {
      logError('API call failed', apiResult.error);
      return NextResponse.json({ 
        error: language === 'ar' 
          ? 'فشل تحليل الصورة. يرجى المحاولة مرة أخرى.' 
          : 'Image analysis failed. Please try again.',
        errorCode: 'ANALYSIS_FAILED'
      }, { status: 500 });
    }

    // Parse response
    let result = parseGeminiResponse(apiResult.text);
    
    if (!result) {
      logStep('Parse failed, using fallback');
      const text = apiResult.text.toLowerCase();
      const hasAI = text.includes('ai generated') || text.includes('artificial');
      
      result = {
        aiProbability: hasAI ? 65 : 35,
        verdict: hasAI ? 'Likely AI' : 'Uncertain',
        confidenceLevel: 'low',
        summary: 'Analysis completed. Structured parsing failed.',
        likelyModel: null,
        artifacts: [],
        analysisDetails: {},
        recommendations: 'Try re-analyzing with a different image.'
      };
    }

    // Normalize result
    const aiProb = Math.max(0, Math.min(100, Math.round(Number(result.aiProbability) || 50)));
    
    // Determine verdict based on probability
    let verdict = result.verdict as string;
    if (!verdict || typeof verdict !== 'string') {
      if (aiProb >= 81) verdict = 'AI Generated';
      else if (aiProb >= 61) verdict = 'Likely AI';
      else if (aiProb >= 41) verdict = 'Uncertain';
      else if (aiProb >= 21) verdict = 'Likely Authentic';
      else verdict = 'Authentic Photo';
    }

    const finalResult = {
      aiProbability: aiProb,
      verdict,
      confidenceLevel: ['high', 'medium', 'low'].includes(result.confidenceLevel as string) 
        ? result.confidenceLevel 
        : 'medium',
      summary: result.summary || 'Analysis completed.',
      likelyModel: result.likelyModel || null,
      artifacts: Array.isArray(result.artifacts) ? result.artifacts : [],
      analysisDetails: result.analysisDetails || {},
      recommendations: result.recommendations || 'Use high-resolution original images for best results.',
      modelUsed: apiResult.modelUsed
    };

    logStep('Analysis complete', { 
      aiProbability: finalResult.aiProbability, 
      verdict: finalResult.verdict,
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
export const maxDuration = 120;
