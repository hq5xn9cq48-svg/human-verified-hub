import { NextResponse } from "next/server";

// Use environment variable with fallback (server-side)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Step-by-step logging utility
function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [IMAGE-ANALYZE] ${step}`, details ? JSON.stringify(details, null, 2) : '');
}

function logError(step: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [IMAGE-ANALYZE ERROR] ${step}:`, error);
}

const systemPrompt = `You are an expert AI image forensics analyst. Your task is to determine if an image is AI-generated or an authentic photograph.

## DETECTION METHODOLOGY

### 1. ANATOMICAL ANALYSIS (For images with people)
- **Hands**: Count fingers (AI often generates 4, 6, or malformed fingers), check joint articulation, nail consistency
- **Eyes**: Verify iris pattern consistency, reflection symmetry, pupil alignment
- **Teeth**: Check for uniform size anomalies, floating teeth, missing gaps
- **Ears**: Look for asymmetry beyond natural variation, detached lobes inconsistency
- **Skin**: Examine for "waxy" or "plastic" textures, pore patterns, wrinkle logic

### 2. TEXTURE & SURFACE ANALYSIS
- **Hair**: Individual strand visibility vs. painted mass appearance
- **Fabric**: Pattern consistency, weave logic, fold physics
- **Backgrounds**: Warping near edges, impossible architecture, blending artifacts
- **Text/Signs**: Gibberish letters, inconsistent fonts, warped characters

### 3. PHYSICS & LIGHTING
- **Shadows**: Direction consistency, soft vs. hard shadow logic
- **Reflections**: Surface reflection accuracy, eye reflection matching
- **Perspective**: Vanishing point consistency, scale logic
- **Depth of Field**: Natural bokeh vs. artificial blur

### 4. AI FINGERPRINT PATTERNS
- **Repetitive patterns**: Tiling artifacts, clone stamps
- **Edge artifacts**: Halo effects, unnatural transitions
- **Color banding**: Gradient stepping in smooth areas
- **Micro-artifacts**: Pixel-level inconsistencies

## SCORING GUIDELINES

- **0-20% AI Probability**: Strong indicators of authentic photograph
  - Natural imperfections present (dust, grain, slight blur)
  - Consistent physics throughout
  - No anatomical anomalies
  
- **21-40% AI Probability**: Likely authentic with some uncertainty
  - Minor anomalies that could be compression artifacts
  - Overall natural appearance
  
- **41-60% AI Probability**: Uncertain/Mixed signals
  - Some AI indicators but not conclusive
  - Could be heavily edited photo OR AI generated
  
- **61-80% AI Probability**: Likely AI Generated
  - Clear artifacts or anatomical issues
  - Multiple AI fingerprints detected
  
- **81-100% AI Probability**: Strong AI Generation indicators
  - Multiple critical anomalies
  - Clear AI model signatures (DALL-E style, Midjourney aesthetic, etc.)

## AI MODEL CLASSIFICATION

If you determine the image is likely AI-generated (>60%), try to identify the probable source:
- **DALL-E 3**: Photorealistic style, sometimes "too perfect", characteristic lighting
- **Midjourney v6**: Artistic/painterly quality, strong composition, distinctive color grading
- **Stable Diffusion XL**: Variable quality, sometimes softer details
- **Sora/Video AI**: Frame-like quality, temporal artifacts if from video
- **Firefly/Adobe**: Clean commercial look, stock photo aesthetic
- **Flux**: High photorealism, sometimes uncanny valley effect
- **Nano Banana Pro**: Excellent detail, natural lighting recreation

## OUTPUT FORMAT (STRICT JSON)

Return ONLY valid JSON with this exact structure:
{
  "aiProbability": <number 0-100>,
  "verdict": "<Authentic Photo | Likely Authentic | Uncertain | Likely AI | AI Generated>",
  "confidenceLevel": "<high | medium | low>",
  "summary": "<2-3 sentence analysis summary>",
  "likelyModel": "<Model name if AI detected, null if authentic>",
  "artifacts": [
    {
      "name": "<artifact name>",
      "category": "<anatomical | texture | physics | artifact>",
      "severity": "<critical | high | medium | low>",
      "location": "<where in image>",
      "description": "<detailed description>"
    }
  ],
  "analysisDetails": {
    "handAnalysis": "<findings or 'N/A - No hands visible'>",
    "eyeAnalysis": "<findings or 'N/A - No eyes visible'>",
    "textureAnalysis": "<skin, hair, fabric findings>",
    "lightingAnalysis": "<shadow and lighting consistency>",
    "backgroundAnalysis": "<background elements analysis>"
  },
  "recommendations": "<verification tips for the user>"
}

IMPORTANT: Return ONLY the JSON object. No markdown, no code blocks, no explanatory text.`;

// Updated model list - using correct Gemini model names for vision
const VISION_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

// Validate and parse JSON response with multiple strategies
function parseGeminiResponse(responseText: string): any {
  logStep('Parsing response', { responseLength: responseText.length });
  
  // Strategy 1: Try direct parsing
  try {
    return JSON.parse(responseText);
  } catch (e) {
    logStep('Direct parse failed, trying cleanup');
  }
  
  // Strategy 2: Remove markdown code blocks
  let cleaned = responseText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    logStep('Cleaned parse failed, extracting JSON object');
  }
  
  // Strategy 3: Extract JSON object using regex
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      logStep('Regex parse failed');
    }
  }
  
  // Strategy 4: Manual bracket extraction
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
      return JSON.parse(jsonStr);
    } catch (e) {
      logStep('Manual extraction failed');
    }
  }
  
  logError('All parsing strategies failed', { preview: responseText.substring(0, 500) });
  return null;
}

async function callGeminiVisionAPI(
  prompt: string, 
  imageData: string, 
  mimeType: string,
  apiKey: string
): Promise<{ text: string | null; error: string | null; modelUsed?: string }> {
  
  for (const model of VISION_MODELS) {
    try {
      logStep(`Trying vision model: ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: imageData } }
              ]
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
              topP: 0.8,
              topK: 40
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
        logError(`Model ${model} failed`, { status: response.status, message: errMessage });
        
        // If it's a 404, the model doesn't exist, try next
        if (response.status === 404) continue;
        
        // If it's rate limit or quota, try next model
        if (response.status === 429 || response.status === 403) continue;
        
        // For other errors, continue to next model
        continue;
      }

      const data = await response.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (responseText) {
        logStep(`Success with model: ${model}`, { responseLength: responseText.length });
        return { text: responseText, error: null, modelUsed: model };
      }
      
      // Check for blocked content
      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        logStep(`Content blocked by safety filters for ${model}`);
        continue;
      }
      
      logStep(`Empty response from ${model}`, { finishReason, data: JSON.stringify(data).substring(0, 200) });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logError(`Timeout for ${model}`, 'Request timed out after 120 seconds');
      } else {
        logError(`Error for ${model}`, error.message);
      }
      continue;
    }
  }

  return { text: null, error: 'All vision models failed to process the image' };
}

export async function POST(req: Request) {
  logStep('=== NEW IMAGE ANALYZE REQUEST ===');
  
  // Check API key first
  if (!GEMINI_API_KEY) {
    logError('API key missing', 'GEMINI_API_KEY environment variable not set');
    return NextResponse.json({ 
      error: 'Service temporarily unavailable. Please try again later.',
      errorCode: 'API_CONFIG_ERROR'
    }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { image, language = 'en' } = body;
    logStep('Request received', { hasImage: !!image, imageType: typeof image, language });

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ 
        error: language === 'ar' ? "لم يتم توفير صورة" : "No image provided",
        errorCode: 'NO_IMAGE'
      }, { status: 400 });
    }

    let base64Data = image;
    let mimeType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
        logStep('Extracted base64 data', { mimeType, dataLength: base64Data.length });
      } else {
        return NextResponse.json({ 
          error: language === 'ar' ? "صيغة صورة غير صالحة" : "Invalid image format. Please use JPG, PNG, or WebP.",
          errorCode: 'INVALID_FORMAT'
        }, { status: 400 });
      }
    }

    // Validate mime type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!validMimeTypes.includes(mimeType)) {
      return NextResponse.json({ 
        error: language === 'ar' ? "صيغة صورة غير مدعومة" : `Unsupported image format: ${mimeType}. Please use JPG, PNG, or WebP.`,
        errorCode: 'UNSUPPORTED_FORMAT'
      }, { status: 400 });
    }

    // Check size (base64 is ~33% larger than binary)
    const estimatedSizeBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB limit
    
    if (estimatedSizeBytes > maxSizeBytes) {
      return NextResponse.json({ 
        error: language === 'ar' ? "الصورة كبيرة جداً (الحد الأقصى 15MB)" : "Image too large. Maximum size is 15MB.",
        errorCode: 'FILE_TOO_LARGE'
      }, { status: 400 });
    }

    logStep('Image validation passed', { 
      mimeType, 
      estimatedSizeMB: (estimatedSizeBytes / 1024 / 1024).toFixed(2) 
    });

    const prompt = `${systemPrompt}\n\nAnalyze this image thoroughly for AI generation indicators. Examine every detail carefully.`;
    const apiResult = await callGeminiVisionAPI(prompt, base64Data, mimeType, GEMINI_API_KEY);

    if (!apiResult.text) {
      logError('All API methods failed', apiResult.error);
      return NextResponse.json({ 
        error: language === 'ar' 
          ? "فشل تحليل الصورة. يرجى المحاولة مرة أخرى أو استخدام صورة مختلفة." 
          : "Image analysis failed. Please try again or use a different image.",
        errorCode: 'ANALYSIS_FAILED',
        details: apiResult.error
      }, { status: 500 });
    }

    // Parse the response
    let result = parseGeminiResponse(apiResult.text);
    
    if (!result) {
      logStep('Parse failed, returning raw analysis');
      // Try to extract key information even if JSON parsing fails
      const text = apiResult.text.toLowerCase();
      const hasAIIndicators = text.includes('ai generated') || text.includes('artificial') || text.includes('generated image');
      
      result = {
        aiProbability: hasAIIndicators ? 65 : 35,
        verdict: hasAIIndicators ? "Likely AI" : "Uncertain",
        confidenceLevel: "low",
        summary: "Analysis completed but structured parsing failed. Manual review recommended.",
        likelyModel: null,
        artifacts: [],
        analysisDetails: {
          rawAnalysis: apiResult.text.substring(0, 500)
        },
        recommendations: "Consider re-analyzing the image or trying with a different image."
      };
    }

    // Normalize and validate result
    result.aiProbability = Math.max(0, Math.min(100, Math.round(Number(result.aiProbability) || 50)));
    
    // Ensure verdict matches probability
    if (!result.verdict || typeof result.verdict !== 'string') {
      if (result.aiProbability >= 81) result.verdict = "AI Generated";
      else if (result.aiProbability >= 61) result.verdict = "Likely AI";
      else if (result.aiProbability >= 41) result.verdict = "Uncertain";
      else if (result.aiProbability >= 21) result.verdict = "Likely Authentic";
      else result.verdict = "Authentic Photo";
    }

    // Ensure arrays and objects exist
    result.artifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
    result.confidenceLevel = ['high', 'medium', 'low'].includes(result.confidenceLevel) ? result.confidenceLevel : "medium";
    result.summary = result.summary || "Analysis completed.";
    result.analysisDetails = result.analysisDetails || {};
    result.recommendations = result.recommendations || "For best results, use high-resolution original images.";
    result.likelyModel = result.likelyModel || null;
    
    // Add model used info
    result.modelUsed = apiResult.modelUsed;

    logStep('Analysis complete', { 
      aiProbability: result.aiProbability, 
      verdict: result.verdict,
      confidence: result.confidenceLevel,
      artifactsCount: result.artifacts.length,
      likelyModel: result.likelyModel
    });
    
    return NextResponse.json(result);

  } catch (error: any) {
    logError("Unhandled error", { message: error.message, stack: error.stack });
    return NextResponse.json({ 
      error: 'An unexpected error occurred during analysis. Please try again.',
      errorCode: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 120;
