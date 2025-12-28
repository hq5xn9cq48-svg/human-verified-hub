import { NextResponse } from "next/server";

const GEMINI_API_KEY = "AIzaSyA5J7uUUwGJZuqFQiLae8XsQe4lJZ4U8Oc";

const systemPrompt = `# ADVANCED TEXT HUMANIZER - V2.0 (LANGUAGE-AWARE)

You are an expert text humanizer with STRICT rules to follow:

## CRITICAL RULES:

### 1. LANGUAGE MIRRORING (MANDATORY):
- Detect the EXACT dialect/language of the input text
- Arabic Fusha (الفصحى) → Return in Fusha ONLY
- Egyptian Arabic → Return in Egyptian ONLY
- Moroccan Arabic → Return in Moroccan ONLY
- Gulf Arabic → Return in Gulf ONLY
- English → Return in English
- **NEVER convert any dialect to Egyptian unless the input IS Egyptian**
- **NEVER mix dialects**

### 2. SEMANTIC INTEGRITY (MANDATORY):
- PRESERVE the original meaning 100%
- If text PRAISES something → output must STILL praise it
- If text CRITICIZES something → output must STILL criticize it
- Do NOT add new opinions or change existing ones
- Do NOT add filler content or unnecessary padding
- Only modify STYLE and STRUCTURE to increase burstiness

### 3. HUMANIZATION TECHNIQUES:
- Vary sentence lengths dramatically (short, medium, long mixed)
- Add natural speech patterns appropriate to the detected dialect
- Include conversational markers natural to that dialect
- Add minor imperfections (hesitations, corrections)
- Remove AI patterns: "Furthermore", "Moreover", "In conclusion"
- Break overly formal structure
- Add emotional expressions natural to the dialect

### 4. INTENT-SPECIFIC STYLES:
Based on the "intent" parameter, adjust the style:

- **default**: Natural, balanced humanization
- **academic**: Maintain scholarly tone but add variety, cite-friendly
- **casual**: Relaxed, conversational, informal expressions
- **business**: Professional but personable, action-oriented
- **creative**: Vivid imagery, metaphors, artistic expression
- **marketing**: Engaging, persuasive, calls to action
- **undetectable**: Maximum humanization - prioritize passing AI detection

## OUTPUT:
Return ONLY the humanized text. No explanations, no metadata.
Preserve the EXACT language/dialect of input.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, intent = 'default' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ 
        error: "No text provided" 
      }, { status: 400 });
    }

    const trimmedText = text.trim();
    if (trimmedText.length < 20) {
      return NextResponse.json({ 
        error: "Text is too short (minimum 20 characters)" 
      }, { status: 400 });
    }

    const processText = trimmedText.length > 10000 
      ? trimmedText.substring(0, 10000) 
      : trimmedText;

    const intentInstructions: Record<string, string> = {
      default: "Apply standard humanization with natural variety.",
      academic: "Maintain academic rigor while adding human touch. Keep citations and formal structure but vary sentence flow.",
      casual: "Make it sound like a friend talking. Use contractions, informal expressions, and relaxed tone.",
      business: "Professional but approachable. Clear, direct, with confident tone.",
      creative: "Add vivid descriptions, metaphors, and artistic flair while keeping the core message.",
      marketing: "Make it persuasive and engaging. Add hooks and calls to action naturally.",
      undetectable: "MAXIMUM humanization. Prioritize passing AI detection. Add genuine imperfections, vary everything, make it truly sound human-written."
    };

    const fullPrompt = `${systemPrompt}

## SELECTED INTENT: ${intent.toUpperCase()}
${intentInstructions[intent] || intentInstructions.default}

---
TEXT TO HUMANIZE:
"""
${processText}
"""

IMPORTANT: First detect the language/dialect, then humanize in that EXACT dialect.
Return ONLY the humanized text:`;

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
            temperature: 0.85,
            topP: 0.95,
            topK: 40,
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
          error: "Failed to humanize text" 
        }, { status: 500 });
      }

      const humanizedText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!humanizedText) {
        return NextResponse.json({ 
          error: "No response received" 
        }, { status: 500 });
      }

      return NextResponse.json({ humanizedText: humanizedText.trim() });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          error: "Request timed out, please try a shorter text"
        }, { status: 408 });
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error("Humanize Error:", error?.message || error);
    return NextResponse.json({ 
      error: "Humanization failed"
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
