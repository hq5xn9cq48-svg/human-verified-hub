import { NextResponse } from "next/server";

const GEMINI_API_KEY = "AIzaSyA5J7uUUwGJZuqFQiLae8XsQe4lJZ4U8Oc";

const systemPrompt = `# AI IMAGE FORENSICS V4.0 - ULTRA DEEP DETECTION
## Specialized in: Mixed Media, Micro-Artifacts, Eyes, Hands

You are an EXPERT forensic image analyst. Analyze images with EXTREME scrutiny.

## PRIMARY DETECTION CATEGORIES:

### 1. ANATOMICAL ANOMALIES (Critical Priority):

**HANDS & FINGERS (Most Reliable AI Indicator):**
- Count fingers on EACH hand visible (should be exactly 5)
- Check for merged/fused digits (AI signature)
- Look for impossible joint angles
- Missing/extra knuckles
- Fingernails: wrong size, shape, or placement
- Palm lines inconsistency
- Wrist-to-hand transition errors
- Finger length proportions

**EYES (Critical):**
- Count eyes on each face (should be 2)
- Iris reflections MUST match between both eyes
- Catchlight consistency (same light source reflection)
- Pupil shape irregularities (should be round)
- Iris pattern repetition (AI often copies patterns)
- Asymmetric eye shapes beyond natural variation
- Eyelash distribution and direction
- Sclera (white part) consistency
- Eye socket depth and shadows

**FACE:**
- Ear symmetry and detailed structure
- Hairline irregularities
- Teeth count and consistency
- Skin texture uniformity (TOO smooth = AI)
- Facial hair patterns and direction
- Nose bridge and nostril symmetry
- Lip texture and natural lines

### 2. MIXED MEDIA DETECTION (Composite Images):

**Noise Pattern Analysis:**
- Different noise patterns in different image areas
- Check background vs subject noise levels
- JPEG compression artifact consistency
- Grain pattern uniformity

**Lighting Inconsistencies:**
- Different lighting directions on different elements
- Shadow direction conflicts
- Highlight placement mismatches
- Color temperature differences between areas

**Edge Artifacts:**
- Unnatural edge sharpness around subjects
- Halo effects at boundaries
- Cut-paste edge artifacts
- Background blending errors

**Resolution Mismatches:**
- Different resolution areas in same image
- Blur level inconsistencies
- Detail level variations
- Upscaling artifacts

### 3. MICRO-ARTIFACTS (Subtle AI Clues):

**Background Analysis:**
- Warping/melting near subjects
- Repeating patterns (especially in foliage, fabric, crowds)
- Text that doesn't make sense
- Impossible architecture/geometry
- Object continuation errors

**Hair Analysis:**
- Solid mass instead of individual strands
- Impossible hair physics
- Hair merging into background
- Unnatural shine patterns
- Strand direction inconsistencies

**Fabric Analysis:**
- Pattern continuity across folds
- Physically impossible draping
- Texture consistency
- Seam and stitching logic

**Texture Anomalies:**
- Plastic/waxy skin appearance
- Overly smooth surfaces
- Repeated texture patches
- Unnatural sharpness transitions

### 4. PHYSICS & REALITY CHECK:

**Shadow Analysis:**
- Multiple conflicting shadow directions
- Shadow softness consistency
- Shadow color accuracy
- Contact shadow presence

**Reflection Analysis:**
- Reflection accuracy on surfaces
- Eye catchlight consistency
- Mirror/glass reflection logic
- Water reflection physics

**Depth & Perspective:**
- Perspective distortions
- Scale inconsistencies
- Depth of field logic
- Vanishing point accuracy

### 5. AI GENERATION SIGNATURES:

**Common AI Tells:**
- Symmetric but imperfect faces
- Overly idealized features
- Watermark remnants or artifacts
- Signature style indicators (DALL-E, Midjourney, SD)
- Consistent "AI look" aesthetics
- Too-perfect composition
- Unnatural bokeh patterns

## SCORING SYSTEM:

**Critical Anomalies (+25-40% each):**
- Wrong finger count
- Eye reflection mismatch
- Major mixed media evidence

**Major Anomalies (+15-25% each):**
- Anatomical errors
- Physics violations
- Obvious editing artifacts

**Minor Anomalies (+5-15% each):**
- Texture inconsistencies
- Minor background issues
- Subtle lighting problems

**Human/Authentic Indicators (-5-20% each):**
- Natural imperfections (moles, wrinkles, asymmetry)
- Consistent physics throughout
- Real camera artifacts (lens flare, motion blur)
- EXIF data consistency indicators
- Natural noise patterns

## OUTPUT FORMAT (JSON ONLY):
{
  "aiProbability": number (0-100),
  "verdict": "Definitely AI" | "Likely AI" | "Uncertain/Mixed" | "Likely Authentic" | "Authentic Photo",
  "confidenceLevel": "very high" | "high" | "medium" | "low",
  "artifacts": [
    {
      "name": "Clear artifact name",
      "category": "anatomical" | "mixed_media" | "micro" | "texture" | "physics",
      "severity": "critical" | "high" | "medium" | "low",
      "location": "Specific location in image",
      "description": "Detailed description with evidence"
    }
  ],
  "analysisDetails": {
    "handAnalysis": "Detailed hand inspection (finger count, joints, nails)",
    "eyeAnalysis": "Eye consistency check (reflections, pupils, iris)",
    "textureAnalysis": "Skin/hair/fabric quality assessment",
    "lightingAnalysis": "Lighting and shadow consistency",
    "backgroundAnalysis": "Background integrity and mixed media check",
    "overallQuality": "General image quality and AI style indicators"
  },
  "summary": "Comprehensive forensic summary with key findings",
  "recommendations": "Manual verification suggestions"
}

## ANALYSIS RULES:
1. Output ONLY valid JSON
2. Be THOROUGH - check every visible detail
3. PRIORITIZE: Hands → Eyes → Mixed Media → Micro
4. Note SPECIFIC locations for all findings
5. Don't assume - find actual evidence
6. Consider that NOT all anomalies prove AI (can be editing)
7. High-quality AI images are harder to detect - be extra cautious`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, language = 'en' } = body;

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
          error: language === 'ar' ? "صيغة الصورة غير صالحة" : "Invalid image format" 
        }, { status: 400 });
      }
    }

    // Validate image size (rough estimate from base64)
    const estimatedSize = base64Data.length * 0.75;
    if (estimatedSize > 15 * 1024 * 1024) {
      return NextResponse.json({ 
        error: language === 'ar' ? "الصورة كبيرة جداً (الحد 15MB)" : "Image too large (max 15MB)" 
      }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

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
                { 
                  text: systemPrompt + "\n\n## ANALYSIS TASK:\nPerform ULTRA-THOROUGH forensic analysis of this image. Check:\n1. ALL visible hands (count fingers!)\n2. ALL visible eyes (check reflections!)\n3. Mixed media/composite indicators\n4. Micro-artifacts and AI signatures\n5. Physics and lighting consistency\n\nReturn JSON only:" 
                },
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
            temperature: 0.03,
            topP: 0.8,
            topK: 10,
            maxOutputTokens: 8192,
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Gemini Vision Error:", response.status, responseData);
        
        if (response.status === 429 || responseData?.error?.status === "RESOURCE_EXHAUSTED") {
          return NextResponse.json({ 
            error: language === 'ar' ? "تم تجاوز الحد، حاول بعد دقيقة" : "Rate limit exceeded, please try again in a minute"
          }, { status: 429 });
        }
        
        return NextResponse.json({ 
          error: language === 'ar' ? "فشل في تحليل الصورة" : "Failed to analyze image" 
        }, { status: 500 });
      }

      const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        return NextResponse.json({ 
          error: language === 'ar' ? "لم يتم استلام تحليل" : "No analysis received" 
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
          error: language === 'ar' ? "فشل في تحليل النتائج" : "Failed to parse analysis results" 
        }, { status: 500 });
      }

      // Normalize and validate
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
          jsonData.verdict = "Uncertain/Mixed";
        } else if (jsonData.aiProbability >= 20) {
          jsonData.verdict = "Likely Authentic";
        } else {
          jsonData.verdict = "Authentic Photo";
        }
      }

      // Ensure arrays exist
      jsonData.artifacts = Array.isArray(jsonData.artifacts) ? jsonData.artifacts : [];
      
      // Validate and normalize artifacts
      jsonData.artifacts = jsonData.artifacts.map((artifact: any) => ({
        name: artifact.name || "Unknown artifact",
        category: ['anatomical', 'mixed_media', 'micro', 'texture', 'physics'].includes(artifact.category) 
          ? artifact.category : 'micro',
        severity: ['critical', 'high', 'medium', 'low'].includes(artifact.severity) 
          ? artifact.severity : 'medium',
        location: artifact.location || "Not specified",
        description: artifact.description || "No details provided"
      }));

      jsonData.confidenceLevel = ['very high', 'high', 'medium', 'low'].includes(jsonData.confidenceLevel) 
        ? jsonData.confidenceLevel : "medium";
      
      jsonData.summary = jsonData.summary || "Analysis completed";
      jsonData.recommendations = jsonData.recommendations || "Verify key details manually";
      
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
          error: language === 'ar' ? "انتهت المهلة، جرب صورة أصغر" : "Analysis timed out, please try a smaller image"
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
export const maxDuration = 120;
