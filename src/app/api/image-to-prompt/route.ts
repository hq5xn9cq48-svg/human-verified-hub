import { NextResponse } from "next/server";

// Use environment variable with fallback (server-side)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDI9GA_o_xoWDgHeubAT5-DeiVWSxk9uu0";

// Step-by-step logging utility
function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [IMAGE-TO-PROMPT] ${step}`, details ? JSON.stringify(details, null, 2) : '');
}

function logError(step: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [IMAGE-TO-PROMPT ERROR] ${step}:`, error);
}

const systemPrompt = `You are an expert AI prompt engineer. Your task is to analyze images and generate detailed, high-quality text prompts that could be used to recreate or generate similar images using AI image generators like Midjourney, DALL-E, or Stable Diffusion.

ANALYSIS REQUIREMENTS:
1. Subject: Identify main subjects, characters, objects
2. Style: Art style, photography type, illustration method
3. Composition: Layout, perspective, framing, focal points
4. Colors: Color palette, lighting, mood
5. Details: Textures, materials, patterns, fine details
6. Atmosphere: Overall mood, ambiance, emotional tone
7. Technical: Resolution hints, aspect ratio, quality descriptors

OUTPUT FORMAT (JSON only):
{
  "prompt": "A comprehensive, detailed prompt describing the image that could recreate it with an AI generator. Include style, subject, composition, lighting, colors, mood, and quality descriptors. Make it 2-4 sentences, vivid and descriptive.",
  "shortPrompt": "A concise 1-sentence version of the prompt for quick use",
  "style": "The detected art/photo style (e.g., 'digital art', 'photography', 'anime', 'oil painting', etc.)",
  "tags": ["array", "of", "relevant", "keywords"],
  "negativePrompt": "What to avoid to recreate this image (e.g., 'blurry, low quality, distorted')"
}

Return ONLY valid JSON, no markdown, no code blocks.`;

// Updated model list - using working models that support vision
const VISION_MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-pro-latest'
];

// Validate and parse JSON response
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
              temperature: 0.7,
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
  logStep('=== NEW IMAGE-TO-PROMPT REQUEST ===');
  
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
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      } else {
        return NextResponse.json({ 
          error: language === 'ar' ? "صيغة صورة غير صالحة" : "Invalid image format" 
        }, { status: 400 });
      }
    }

    if (base64Data.length > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: language === 'ar' ? "الصورة كبيرة جداً" : "Image too large (max 10MB)" 
      }, { status: 400 });
    }

    logStep('Image data prepared', { mimeType, dataLength: base64Data.length });

    const langHint = language === 'ar' 
      ? "\n\nIMPORTANT: Output the prompt and all text in Arabic language."
      : "";
    
    const prompt = `${systemPrompt}${langHint}\n\nAnalyze this image and generate a detailed AI prompt to recreate it:`;
    const apiResult = await callGeminiVisionAPI(prompt, base64Data, mimeType, GEMINI_API_KEY);

    if (!apiResult.text) {
      logError('All API methods failed', apiResult.error);
      return NextResponse.json({ 
        error: language === 'ar' ? "فشل التحليل. حاول مرة أخرى." : "Prompt generation failed. Please try again." 
      }, { status: 500 });
    }

    let result = parseGeminiResponse(apiResult.text);
    
    if (!result) {
      logStep('Parse failed, creating fallback result');
      result = {
        prompt: apiResult.text.substring(0, 500),
        shortPrompt: "Unable to parse structured response",
        style: "unknown",
        tags: [],
        negativePrompt: "blurry, low quality"
      };
    }

    // Ensure all fields exist
    result.prompt = result.prompt || "No prompt generated";
    result.shortPrompt = result.shortPrompt || result.prompt?.substring(0, 100) || "";
    result.style = result.style || "unknown";
    result.tags = Array.isArray(result.tags) ? result.tags : [];
    result.negativePrompt = result.negativePrompt || "";

    logStep('Prompt generation complete', { promptLength: result.prompt.length });
    return NextResponse.json(result);

  } catch (error: any) {
    logError("Unhandled error", error);
    return NextResponse.json({ 
      error: `Prompt generation failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 90;
