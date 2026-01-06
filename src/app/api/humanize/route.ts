import { NextResponse } from "next/server";

// Use environment variable only - no hardcoded keys
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const systemPrompt = `You are an expert text humanizer. Your job is to make AI-generated text sound more natural and human-like.

CRITICAL RULES:
1. PRESERVE the original meaning 100%
2. DETECT and KEEP the original language/dialect (Arabic Fusha, Egyptian, Gulf, English, etc.)
3. DO NOT convert any dialect to another
4. ONLY modify style and structure

HUMANIZATION TECHNIQUES:
- Vary sentence lengths (mix short, medium, long)
- Add natural speech patterns
- Remove AI phrases: "Furthermore", "Moreover", "In conclusion", "It's worth noting"
- Add minor imperfections where natural
- Use contractions in English
- Add conversational markers

STYLES:
- default: Natural, balanced
- academic: Scholarly but varied
- casual: Relaxed, conversational  
- business: Professional, direct
- creative: Vivid, artistic
- marketing: Engaging, persuasive
- undetectable: Maximum humanization

OUTPUT: Return ONLY the humanized text, nothing else.`;

export async function POST(req: Request) {
  // Check API key first
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ 
      error: "API key not configured. Please set GEMINI_API_KEY environment variable." 
    }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { text, intent = 'default', language = 'en' } = body;

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json({ 
        error: language === 'ar' ? "النص قصير جداً (20 حرف على الأقل)" : "Text too short (min 20 chars)" 
      }, { status: 400 });
    }

    const processText = text.trim().substring(0, 8000);

    const styleInstructions: Record<string, string> = {
      default: "Apply natural humanization.",
      academic: "Keep scholarly tone but add human variation.",
      casual: "Make it very conversational and relaxed.",
      business: "Professional but personable and direct.",
      creative: "Add vivid imagery and artistic flair.",
      marketing: "Make it engaging and persuasive.",
      undetectable: "MAXIMUM humanization to bypass AI detectors."
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `${systemPrompt}\n\nStyle: ${intent.toUpperCase()}\n${styleInstructions[intent] || styleInstructions.default}\n\nText to humanize:\n"""${processText}"""\n\nReturn ONLY the humanized text:` 
              }] 
            }],
            generationConfig: {
              temperature: 0.8,
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
      const humanizedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!humanizedText) {
        return NextResponse.json({ 
          error: language === 'ar' ? "لم يتم استلام رد" : "No response received from AI" 
        }, { status: 500 });
      }

      // Clean unwanted prefixes
      let cleaned = humanizedText.trim();
      const prefixes = ["Here is", "Here's", "Humanized:", "إليك", "النص المحسن:"];
      for (const p of prefixes) {
        if (cleaned.toLowerCase().startsWith(p.toLowerCase())) {
          cleaned = cleaned.substring(p.length).trim();
        }
      }

      return NextResponse.json({ humanizedText: cleaned });

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
    console.error("Humanize Error:", error);
    return NextResponse.json({ 
      error: `Humanization failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
