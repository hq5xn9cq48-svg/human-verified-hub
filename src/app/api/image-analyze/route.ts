import { NextResponse } from "next/server";

// Use environment variable with fallback (server-side)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDI9GA_o_xoWDgHeubAT5-DeiVWSxk9uu0";

// Step-by-step logging utility
function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [IMAGE-ANALYZE] ${step}`, details ? JSON.stringify(details, null, 2) : '');
}

function logError(step: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [IMAGE-ANALYZE ERROR] ${step}:`, error);
}

const systemPrompt = `You are an AI image forensics expert. Analyze images to detect if they are AI-generated.

DETECTION CATEGORIES:
1. Anatomical: Check hands (finger count), eyes (reflection consistency), teeth, ears
2. Texture: Skin (waxy/plastic look), hair (individual strands vs mass), fabric patterns
3. Physics: Lighting consistency, shadow direction, reflections
4. Artifacts: Background warping, text errors, repeating patterns

SCORING:
- aiProbability 0-30: Authentic photo (natural imperfections, consistent physics)
- aiProbability 31-60: Uncertain (some anomalies but not conclusive)
- aiProbability 61-100: AI Generated (clear artifacts or anatomical errors)

OUTPUT FORMAT (JSON only):
{
  "aiProbability": number (0-100),
  "verdict": "Authentic Photo" | "Likely Authentic" | "Uncertain" | "Likely AI" | "AI Generated",
  "confidenceLevel": "high" | "medium" | "low",
  "summary": "Brief explanation",
  "artifacts": [
    {"name": "artifact name", "category": "anatomical|texture|physics|artifact", "severity": "critical|high|medium|low", "location": "where", "description": "details"}
  ],
  "analysisDetails": {
    "handAnalysis": "findings or N/A",
    "eyeAnalysis": "findings or N/A", 
    "textureAnalysis": "findings",
    "lightingAnalysis": "findings",
    "backgroundAnalysis": "findings"
  },
  "recommendations": "verification tips"
}

Return ONLY valid JSON, no markdown, no code blocks.`;

// Updated model list - using working models that support vision
const VISION_MODELS = [
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
  
  logError('All parsing strategies failed', { preview: responseText.substring(0, 200) });
  return null;
}

async function callGeminiVisionAPI(
  prompt: string, 
  imageData: string, 
  mimeType: string,
  apiKey: string
): Promise<{ text: string | null; error: string | null }> {
  
  for (const model of VISION_MODELS) {
    try {
      logStep(`Trying vision model: ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

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
              temperature: 0.1,
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
      
      // Check for blocked content
      if (data?.candidates?.[0]?.finishReason === 'SAFETY') {
        logStep(`Content blocked by safety filters for ${model}`);
        continue;
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

  return { text: null, error: 'All vision models failed' };
}

export async function POST(req: Request) {
  logStep('=== NEW IMAGE ANALYZE REQUEST ===');
  
  // Check API key first
  if (!GEMINI_API_KEY) {
    logError('API key missing', 'GEMINI_API_KEY not set');
    return NextResponse.json({ 
      error: 'API configuration error. Please contact support.' 
    }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { image, language = 'en' } = body;
    logStep('Request received', { hasImage: !!image, language });

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ 
        error: language === 'ar' ? "لم يتم توفير صورة" : "No image provided" 
      }, { status: 400 });
    }

    let base64Data = image;
    let mimeType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      // More flexible regex to handle various data URI formats
      // Supports: data:image/png;base64,xxx, data:image/jpeg;charset=utf-8;base64,xxx, etc.
      const matches = image.match(/^data:([^;,]+)(?:;[^;,]*)*;base64,(.+)$/i);
      if (matches) {
        mimeType = matches[1] || 'image/jpeg';
        base64Data = matches[2];
      } else {
        // Fallback: try to extract base64 data after the comma
        const commaIndex = image.indexOf(',');
        if (commaIndex !== -1) {
          // Try to extract MIME type from the prefix
          const prefix = image.substring(0, commaIndex);
          const mimeMatch = prefix.match(/data:([^;,]+)/);
          if (mimeMatch) {
            mimeType = mimeMatch[1];
          }
          base64Data = image.substring(commaIndex + 1);
        } else {
          return NextResponse.json({ 
            error: language === 'ar' ? "صيغة صورة غير صالحة" : "Invalid image format" 
          }, { status: 400 });
        }
      }
    }

    // Check size (roughly)
    if (base64Data.length > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: language === 'ar' ? "الصورة كبيرة جداً" : "Image too large (max 10MB)" 
      }, { status: 400 });
    }

    logStep('Image data prepared', { mimeType, dataLength: base64Data.length });

    const prompt = `${systemPrompt}\n\nAnalyze this image for AI generation indicators:`;
    const apiResult = await callGeminiVisionAPI(prompt, base64Data, mimeType, GEMINI_API_KEY);

    if (!apiResult.text) {
      logError('All API methods failed', apiResult.error);
      return NextResponse.json({ 
        error: language === 'ar' ? "فشل التحليل. حاول مرة أخرى." : "Image analysis failed. Please try again." 
      }, { status: 500 });
    }

    // Parse the response
    let result = parseGeminiResponse(apiResult.text);
    
    if (!result) {
      logStep('Parse failed, creating fallback result');
      result = {
        aiProbability: 50,
        verdict: "Uncertain",
        confidenceLevel: "low",
        summary: "Analysis could not be completed properly.",
        artifacts: [],
        analysisDetails: {},
        recommendations: "Try with a different image."
      };
    }

    // Normalize result
    result.aiProbability = Math.max(0, Math.min(100, Number(result.aiProbability) || 50));
    
    if (!result.verdict) {
      if (result.aiProbability >= 70) result.verdict = "AI Generated";
      else if (result.aiProbability >= 50) result.verdict = "Likely AI";
      else if (result.aiProbability >= 30) result.verdict = "Uncertain";
      else result.verdict = "Likely Authentic";
    }

    result.artifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
    result.confidenceLevel = result.confidenceLevel || "medium";
    result.summary = result.summary || "Analysis completed.";
    result.analysisDetails = result.analysisDetails || {};
    result.recommendations = result.recommendations || "";

    logStep('Analysis complete', { aiProbability: result.aiProbability, verdict: result.verdict });
    return NextResponse.json(result);

  } catch (error: any) {
    logError("Unhandled error", error);
    return NextResponse.json({ 
      error: `Image analysis failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 90;
