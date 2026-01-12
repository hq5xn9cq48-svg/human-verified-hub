import { NextResponse } from "next/server";

// Use environment variable with fallback (server-side)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

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

// Updated model list - using stable Gemini vision models (2025 verified working)
const VISION_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp',
  'gemini-pro-vision'
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
  
  const errors: string[] = [];
  
  for (const model of VISION_MODELS) {
    try {
      logStep(`Trying vision model: ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      // Build the API URL based on model type
      const apiVersion = model.includes('vision') ? 'v1' : 'v1beta';
      const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
      
      logStep(`API URL: ${apiUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);

      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            { 
              inlineData: { 
                mimeType: mimeType.toLowerCase(), 
                data: imageData 
              } 
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ]
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      logStep(`Response status: ${response.status}`, { responsePreview: responseText.substring(0, 200) });

      if (!response.ok) {
        let errMessage = `HTTP ${response.status}`;
        try {
          const errData = JSON.parse(responseText);
          errMessage = errData?.error?.message || errMessage;
        } catch {}
        logError(`Model ${model} HTTP error`, errMessage);
        errors.push(`${model}: ${errMessage}`);
        continue;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        logError(`Model ${model} JSON parse error`, responseText.substring(0, 200));
        errors.push(`${model}: Failed to parse response`);
        continue;
      }

      // Check for various response formats
      const textContent = 
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.candidates?.[0]?.output ||
        data?.text;

      if (textContent) {
        logStep(`Success with model: ${model}`, { responseLength: textContent.length });
        return { text: textContent, error: null };
      }
      
      // Check finish reason
      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        logStep(`Content blocked by safety filters for ${model}`);
        errors.push(`${model}: Content blocked by safety filters`);
        continue;
      }
      
      if (finishReason === 'RECITATION') {
        logStep(`Content blocked due to recitation for ${model}`);
        errors.push(`${model}: Content blocked due to recitation`);
        continue;
      }
      
      logStep(`Empty or unexpected response from ${model}`, { data: JSON.stringify(data).substring(0, 300) });
      errors.push(`${model}: Empty response`);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logError(`Timeout for ${model}`, 'Request timed out after 60s');
        errors.push(`${model}: Request timed out`);
      } else {
        logError(`Error for ${model}`, error.message);
        errors.push(`${model}: ${error.message}`);
      }
      continue;
    }
  }

  return { text: null, error: `All models failed: ${errors.join('; ')}` };
}

export async function POST(req: Request) {
  logStep('=== NEW IMAGE-TO-PROMPT REQUEST ===');
  
  // Check API key
  const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logError('API key missing', 'GEMINI_API_KEY not set in environment');
    return NextResponse.json({ 
      error: 'API configuration error. GEMINI_API_KEY is not configured. Please contact support.' 
    }, { status: 500 });
  }

  logStep('API Key check passed', { keyLength: apiKey.length, keyPrefix: apiKey.substring(0, 10) + '...' });

  try {
    const body = await req.json();
    const { image, language = 'en' } = body;
    logStep('Request received', { hasImage: !!image, imageType: typeof image, language });

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ 
        error: language === 'ar' ? "لم يتم توفير صورة" : "No image provided" 
      }, { status: 400 });
    }

    let base64Data = image;
    let mimeType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      logStep('Processing data URI', { uriLength: image.length, prefix: image.substring(0, 50) });
      
      // Find the comma that separates the header from the base64 data
      const commaIndex = image.indexOf(',');
      if (commaIndex === -1) {
        return NextResponse.json({ 
          error: language === 'ar' ? "صيغة صورة غير صالحة" : "Invalid image format - no data separator found" 
        }, { status: 400 });
      }
      
      // Extract the header and data
      const header = image.substring(0, commaIndex);
      base64Data = image.substring(commaIndex + 1);
      
      // Parse MIME type from header (e.g., "data:image/png;base64")
      const mimeMatch = header.match(/data:([^;,]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      
      logStep('Data URI parsed', { mimeType, headerLength: header.length, dataLength: base64Data.length });
    } else {
      logStep('Image appears to be raw base64', { dataLength: base64Data.length });
    }

    // Validate base64 data
    if (!base64Data || base64Data.length < 100) {
      return NextResponse.json({ 
        error: language === 'ar' ? "بيانات الصورة غير كافية" : "Image data is too short or empty" 
      }, { status: 400 });
    }

    // Check size (base64 is ~33% larger than binary, so 10MB binary = ~13.3MB base64)
    if (base64Data.length > 15 * 1024 * 1024) {
      return NextResponse.json({ 
        error: language === 'ar' ? "الصورة كبيرة جداً" : "Image too large (max 10MB)" 
      }, { status: 400 });
    }

    logStep('Image data validated', { mimeType, dataLength: base64Data.length });

    const langHint = language === 'ar' 
      ? "\n\nIMPORTANT: Output the prompt and all text in Arabic language."
      : "";
    
    const prompt = `${systemPrompt}${langHint}\n\nAnalyze this image and generate a detailed AI prompt to recreate it:`;
    const apiResult = await callGeminiVisionAPI(prompt, base64Data, mimeType, apiKey);

    if (!apiResult.text) {
      logError('All API methods failed', apiResult.error);
      return NextResponse.json({ 
        error: language === 'ar' 
          ? "فشل التحليل. حاول مرة أخرى." 
          : `Prompt generation failed: ${apiResult.error || 'All vision models failed'}. Please try again with a different image.` 
      }, { status: 500 });
    }

    let result = parseGeminiResponse(apiResult.text);
    
    if (!result) {
      logStep('Parse failed, creating fallback result from raw text');
      // Try to use the raw text as the prompt if JSON parsing fails
      const cleanedText = apiResult.text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
      result = {
        prompt: cleanedText.substring(0, 1000) || "Unable to generate prompt",
        shortPrompt: cleanedText.substring(0, 150) || "Unable to parse response",
        style: "unknown",
        tags: [],
        negativePrompt: "blurry, low quality, distorted"
      };
    }

    // Ensure all fields exist and are valid
    result.prompt = result.prompt || "No prompt generated";
    result.shortPrompt = result.shortPrompt || result.prompt?.substring(0, 100) || "";
    result.style = result.style || "unknown";
    result.tags = Array.isArray(result.tags) ? result.tags : [];
    result.negativePrompt = result.negativePrompt || "";

    logStep('Prompt generation complete', { promptLength: result.prompt.length, style: result.style });
    return NextResponse.json(result);

  } catch (error: any) {
    logError("Unhandled error", { message: error.message, stack: error.stack });
    return NextResponse.json({ 
      error: `Prompt generation failed: ${error.message || 'Unknown error'}. Please try again.` 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 90;
