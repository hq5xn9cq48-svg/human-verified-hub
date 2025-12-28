import { NextResponse } from "next/server";

const GEMINI_API_KEY = "AIzaSyA5J7uUUwGJZuqFQiLae8XsQe4lJZ4U8Oc";

// Ultra-Strict Anti-AI Detection System Prompt
const systemPrompt = `# SENTINEL-AI FORENSIC ANALYZER V3.0 - ULTRA SKEPTICAL MODE

## CORE DIRECTIVE:
You are an EXTREMELY SKEPTICAL forensic linguistic analyst. Your job is to ASSUME all text is AI-generated until PROVEN otherwise with OVERWHELMING human evidence.

## SKEPTICISM PROTOCOL (MANDATORY):
1. DEFAULT SCORE: Start at 15 (highly suspicious)
2. "Perfect" text = AI text (humans make errors)
3. Text without personal experiences/anecdotes = likely AI
4. Consistent paragraph lengths = AI signature
5. Balanced arguments without emotional bias = AI
6. Zero typos + perfect grammar = AI (humans make mistakes)

## AI DETECTION SIGNATURES (Heavy Penalties):

### Structural Patterns (-5 to -20 each):
- Transitional clichés: "Furthermore", "Moreover", "In conclusion", "It's worth noting", "Additionally" → -15 each
- Perfect bullet point lists → -10
- Uniform paragraph lengths (±10 words) → -20
- S-V-O sentence pattern repetition → -15
- Opening with definitions → -10
- Closing with summary → -10

### Linguistic Patterns (-5 to -20 each):
- Hedging: "It is important to", "One might argue", "It could be said" → -10 each
- Generic praise: "fascinating", "remarkable", "significant" → -5 each
- Neutral/balanced tone throughout → -15
- No contractions in English → -10
- Perfect punctuation → -10
- No colloquialisms or slang → -15

### Content Patterns (-10 to -25 each):
- No personal pronouns (I, my, we) → -20
- No specific personal anecdotes → -25
- No emotional inconsistency (real humans have mood shifts) → -15
- Overly comprehensive coverage → -15
- Too organized structure → -10

## HUMAN INDICATORS (MUST BE GENUINE - Not Fake):

### ONLY add points if evidence is STRONG:
- GENUINE typos (not deliberate fakes) → +20
- Real personal anecdote with SPECIFIC details → +30
- Emotional expressions (frustration, excitement, humor) → +20
- Colloquial/slang expressions natural to context → +15
- Sentence length variation (5 words to 40+ words) → +20
- Incomplete thoughts or tangents → +15
- Self-corrections ("I mean...", "actually...") → +15
- Cultural references with context → +15
- Opinion stated without hedging → +15

## ANTI-TRICKERY MEASURES:
- Deliberate errors that look fake = STILL AI (deduct -10)
- "Personal" stories that are generic = STILL AI
- Forced informality = STILL AI
- If it FEELS like it's trying to seem human = IT'S AI

## SCORING:
- 0-20: Definite AI (default category)
- 21-40: Likely AI  
- 41-60: Uncertain/Hybrid
- 61-80: Possibly Human
- 81-100: Confirmed Human (RARE - needs strong evidence)

## OUTPUT FORMAT (JSON ONLY):
{
  "analysisMetadata": {
    "wordCount": number,
    "perplexityLevel": "very low/low/medium/high/very high",
    "burstinessScore": "monotonous/low/medium/varied/explosive",
    "sentenceLengthVariance": "uniform/low/medium/high"
  },
  "humanScore": number (0-100),
  "verdict": "AI Generated" | "Likely AI" | "Uncertain" | "Possibly Human" | "Human",
  "confidenceLevel": "very high/high/medium/low",
  "summary": "Detailed forensic summary explaining the verdict",
  "aiIndicators": [
    {"pattern": "Pattern name", "penalty": number, "evidence": "Specific evidence from text"}
  ],
  "humanIndicators": [
    {"pattern": "Pattern name", "bonus": number, "evidence": "Specific evidence from text"}
  ],
  "forensicDetails": {
    "syntaxAnalysis": "Detailed syntax breakdown",
    "lexicalRichness": "Vocabulary diversity assessment",
    "predictability": "How predictable is the text flow",
    "emotionalConsistency": "Assessment of emotional patterns",
    "structuralAnalysis": "Paragraph and sentence structure analysis"
  },
  "suspiciousPatterns": ["List of specific AI fingerprints found"]
}

## STRICT OUTPUT RULES:
1. Output ONLY valid JSON
2. Be HARSH - most text online IS AI now
3. Require STRONG evidence for human classification
4. Short texts (<50 words) = automatic uncertainty, note in summary`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, language = 'en' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ 
        error: language === 'ar' ? "لم يتم توفير نص للتحليل" : "No text provided for analysis" 
      }, { status: 400 });
    }

    const trimmedText = text.trim();
    if (trimmedText.length < 10) {
      return NextResponse.json({ 
        error: language === 'ar' ? "النص قصير جداً" : "Text is too short" 
      }, { status: 400 });
    }

    const analysisText = trimmedText.length > 15000 
      ? trimmedText.substring(0, 15000) + "..." 
      : trimmedText;

    const fullPrompt = `${systemPrompt}

---
TEXT TO ANALYZE:
"""
${analysisText}
"""

Perform thorough forensic analysis. Return JSON only:`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

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
                { text: fullPrompt }
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
        
        if (response.status === 429 || responseData?.error?.status === "RESOURCE_EXHAUSTED") {
          return NextResponse.json({ 
            error: language === 'ar' 
              ? "تم استنفاد الحصة، يرجى المحاولة بعد دقيقة" 
              : "Rate limit exceeded, please try again in a minute"
          }, { status: 429 });
        }
        
        return NextResponse.json({ 
          error: language === 'ar' ? "فشل الاتصال بخدمة التحليل" : "Failed to connect to analysis service" 
        }, { status: 500 });
      }

      const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        return NextResponse.json({ 
          error: language === 'ar' ? "لم يتم استلام استجابة" : "No response received" 
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
          error: language === 'ar' ? "فشل في تحليل الاستجابة" : "Failed to parse response" 
        }, { status: 500 });
      }

      // Validate and normalize
      if (typeof jsonData.humanScore === 'string') {
        jsonData.humanScore = parseInt(jsonData.humanScore, 10) || 15;
      }
      jsonData.humanScore = Math.max(0, Math.min(100, jsonData.humanScore ?? 15));

      if (!jsonData.verdict) {
        if (jsonData.humanScore <= 20) {
          jsonData.verdict = language === 'ar' ? "ذكاء اصطناعي مؤكد" : "AI Generated";
        } else if (jsonData.humanScore <= 40) {
          jsonData.verdict = language === 'ar' ? "غالباً ذكاء اصطناعي" : "Likely AI";
        } else if (jsonData.humanScore <= 60) {
          jsonData.verdict = language === 'ar' ? "غير مؤكد" : "Uncertain";
        } else if (jsonData.humanScore <= 80) {
          jsonData.verdict = language === 'ar' ? "محتمل بشري" : "Possibly Human";
        } else {
          jsonData.verdict = language === 'ar' ? "بشري مؤكد" : "Human";
        }
      }

      jsonData.aiIndicators = Array.isArray(jsonData.aiIndicators) ? jsonData.aiIndicators : [];
      jsonData.humanIndicators = Array.isArray(jsonData.humanIndicators) ? jsonData.humanIndicators : [];
      jsonData.suspiciousPatterns = Array.isArray(jsonData.suspiciousPatterns) ? jsonData.suspiciousPatterns : [];

      if (!jsonData.analysisMetadata) {
        jsonData.analysisMetadata = {
          wordCount: analysisText.split(/\s+/).length,
          perplexityLevel: "medium",
          burstinessScore: "varied",
          sentenceLengthVariance: "medium"
        };
      }

      if (!jsonData.forensicDetails) {
        jsonData.forensicDetails = {
          syntaxAnalysis: "N/A",
          lexicalRichness: "N/A",
          predictability: "N/A",
          emotionalConsistency: "N/A",
          structuralAnalysis: "N/A"
        };
      }

      jsonData.confidenceLevel = jsonData.confidenceLevel || "medium";

      return NextResponse.json(jsonData);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          error: language === 'ar' 
            ? "انتهت مهلة التحليل، يرجى تجربة نص أقصر" 
            : "Analysis timed out, please try a shorter text"
        }, { status: 408 });
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error("Analysis Error:", error?.message || error);
    return NextResponse.json({ 
      error: "Analysis failed"
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
