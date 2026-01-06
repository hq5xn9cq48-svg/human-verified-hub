import { NextResponse } from "next/server";

// Use environment variable only - no hardcoded keys
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

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

Return ONLY valid JSON.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, language = 'en' } = body;

    // Check API key first
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: language === 'ar' 
          ? 'مفتاح API غير مكوّن. يرجى تعيين متغير البيئة GEMINI_API_KEY.'
          : 'API key not configured. Please set GEMINI_API_KEY environment variable.' 
      }, { status: 500 });
    }

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

    // Check size (roughly)
    if (base64Data.length > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: language === 'ar' ? "الصورة كبيرة جداً" : "Image too large (max 10MB)" 
      }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `${systemPrompt}\n\nAnalyze this image for AI generation indicators:` },
                { inlineData: { mimeType, data: base64Data } }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096,
            }
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Gemini API Error:", response.status, errData);
        
        // Return actual Google error message for debugging
        const googleError = errData?.error?.message || errData?.error?.status || `HTTP ${response.status}`;
        return NextResponse.json({ 
          error: `Gemini API Error: ${googleError}` 
        }, { status: response.status });
      }

      const data = await response.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        return NextResponse.json({ 
          error: language === 'ar' ? "لم يتم استلام تحليل" : "No analysis received from AI" 
        }, { status: 500 });
      }

      let result;
      try {
        const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
      } catch {
        result = {
          aiProbability: 50,
          verdict: "Uncertain",
          confidenceLevel: "low",
          summary: "Analysis could not be completed.",
          artifacts: [],
          analysisDetails: {},
          recommendations: "Try with a different image."
        };
      }

      // Normalize
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

      return NextResponse.json(result);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          error: language === 'ar' ? "انتهت المهلة" : "Request timed out" 
        }, { status: 408 });
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error("Image Analysis Error:", error);
    return NextResponse.json({ 
      error: `Image analysis failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 90;
