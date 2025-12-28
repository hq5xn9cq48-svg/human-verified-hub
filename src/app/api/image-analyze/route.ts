import { NextResponse } from "next/server";

const GEMINI_API_KEY = "AIzaSyA5J7uUUwGJZuqFQiLae8XsQe4lJZ4U8Oc";

const systemPrompt = `# AI IMAGE FORENSICS ANALYZER V3.0 - DEEP ARTIFACT DETECTION

You are an expert forensic image analyst specializing in detecting AI-generated and manipulated images.

## PRIMARY DETECTION CATEGORIES:

### 1. ANATOMICAL ANOMALIES (Critical):
**Hands & Fingers** (Most reliable indicator):
- Count fingers on EACH hand (should be exactly 5)
- Check for merged/fused digits
- Look for impossible joint angles
- Missing/extra knuckles
- Fingernails abnormalities

**Eyes**:
- Iris reflections should match between both eyes
- Catchlight consistency (same light source reflection)
- Pupil shape irregularities
- Iris pattern repetition (AI often copies patterns)
- Asymmetric eye shapes beyond natural variation

**Face**:
- Ear symmetry and structure
- Hairline irregularities
- Teeth consistency and count
- Skin texture uniformity (too smooth = AI)
- Facial hair patterns

### 2. MIXED MEDIA DETECTION (Composite Images):
- Different noise patterns in different areas
- Inconsistent lighting directions
- Edge artifacts around subjects
- Color temperature mismatches
- Resolution differences between elements
- JPEG artifact inconsistencies

### 3. MICRO-ARTIFACTS (Subtle Clues):
- Background warping/melting near subjects
- Text that doesn't make sense
- Repeating patterns (especially in hair, fabric, backgrounds)
- Unnatural bokeh/blur patterns
- Color banding in gradients
- Symmetry that's too perfect

### 4. TEXTURE ANALYSIS:
- Skin: Check for plastic/waxy appearance
- Hair: Look for solid mass instead of individual strands
- Fabric: Texture consistency and fold physics
- Background: Details that merge or repeat

### 5. PHYSICS & LIGHTING:
- Shadow direction consistency
- Reflection accuracy
- Light source count and positions
- Physical object interactions

## SCORING MATRIX:
- Each critical anomaly (hands, eyes): +20-30% AI probability
- Each major artifact: +10-20%
- Each minor artifact: +5-10%
- Natural imperfections that humans have: -5-15%
- Consistent physics/lighting: -10%

## OUTPUT FORMAT (JSON ONLY):
{
  "aiProbability": number (0-100),
  "verdict": "Definitely AI" | "Likely AI" | "Uncertain" | "Likely Human" | "Authentic Photo",
  "confidenceLevel": "very high/high/medium/low",
  "artifacts": [
    {
      "name": "Artifact name",
      "category": "anatomical/mixed_media/micro/texture/physics",
      "severity": "critical/high/medium/low",
      "location": "Where in the image",
      "description": "Detailed description of the artifact"
    }
  ],
  "analysisDetails": {
    "handAnalysis": "Detailed hand inspection results",
    "eyeAnalysis": "Eye consistency check results",
    "textureAnalysis": "Texture quality assessment",
    "lightingAnalysis": "Lighting consistency check",
    "backgroundAnalysis": "Background integrity check",
    "overallQuality": "General image quality notes"
  },
  "summary": "Comprehensive forensic summary",
  "recommendations": "What to look for if verifying manually"
}

## RULES:
1. Output ONLY valid JSON
2. Be thorough - check EVERY detail
3. Prioritize hand and eye analysis
4. Note specific locations of artifacts
5. Don't assume - look for actual evidence`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ 
        error: "No image provided" 
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
          error: "Invalid image format" 
        }, { status: 400 });
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt + "\n\nAnalyze this image thoroughly for AI generation indicators. Return JSON only:" },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.05,
            topP: 0.8,
            topK: 10,
            maxOutputTokens: 4096,
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Gemini API Error:", response.status, responseData);
        
        if (response.status === 429) {
          return NextResponse.json({ 
            error: "Rate limit exceeded, please try again in a minute"
          }, { status: 429 });
        }
        
        return NextResponse.json({ 
          error: "Failed to analyze image" 
        }, { status: 500 });
      }

      const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        return NextResponse.json({ 
          error: "No response received" 
        }, { status: 500 });
      }

      let jsonData;
      try {
        let cleanText = responseText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/gi, '')
          .trim();
        
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanText = jsonMatch[0];
        }
        
        jsonData = JSON.parse(cleanText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        return NextResponse.json({ 
          error: "Failed to parse analysis results" 
        }, { status: 500 });
      }

      // Normalize
      if (typeof jsonData.aiProbability === 'string') {
        jsonData.aiProbability = parseInt(jsonData.aiProbability, 10) || 50;
      }
      jsonData.aiProbability = Math.max(0, Math.min(100, jsonData.aiProbability ?? 50));

      if (!jsonData.verdict) {
        if (jsonData.aiProbability >= 85) {
          jsonData.verdict = "Definitely AI";
        } else if (jsonData.aiProbability >= 65) {
          jsonData.verdict = "Likely AI";
        } else if (jsonData.aiProbability >= 40) {
          jsonData.verdict = "Uncertain";
        } else if (jsonData.aiProbability >= 20) {
          jsonData.verdict = "Likely Human";
        } else {
          jsonData.verdict = "Authentic Photo";
        }
      }

      jsonData.artifacts = Array.isArray(jsonData.artifacts) ? jsonData.artifacts : [];
      jsonData.confidenceLevel = jsonData.confidenceLevel || "medium";
      jsonData.summary = jsonData.summary || "Analysis completed";
      
      if (!jsonData.analysisDetails) {
        jsonData.analysisDetails = {
          handAnalysis: "Not analyzed",
          eyeAnalysis: "Not analyzed",
          textureAnalysis: "Not analyzed",
          lightingAnalysis: "Not analyzed",
          backgroundAnalysis: "Not analyzed",
          overallQuality: "Not analyzed"
        };
      }

      return NextResponse.json(jsonData);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          error: "Analysis timed out, please try a smaller image"
        }, { status: 408 });
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error("Image Analysis Error:", error?.message || error);
    return NextResponse.json({ 
      error: "Image analysis failed"
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 90;
