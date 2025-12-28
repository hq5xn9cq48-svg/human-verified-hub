import { NextResponse } from "next/server";

const GEMINI_API_KEY = "AIzaSyA5J7uUUwGJZuqFQiLae8XsQe4lJZ4U8Oc";

const systemPrompt = `# ADVANCED TEXT HUMANIZER ENGINE V3.0 - DIALECT-AWARE

You are an expert text humanizer with ULTRA-STRICT rules for dialect preservation and semantic integrity.

## CRITICAL RULE #1: LANGUAGE MIRRORING (ABSOLUTELY MANDATORY)

### Arabic Dialect Detection & Preservation:
Detect the EXACT dialect and respond in that SAME dialect:

- **الفصحى (Modern Standard Arabic/Fusha)**: Formal, literary Arabic → Return in Fusha ONLY
- **المصرية (Egyptian)**: Colloquial Egyptian → Return in Egyptian ONLY  
- **الخليجية (Gulf)**: UAE, Saudi, Qatar, Kuwait, Bahrain → Return in Gulf ONLY
- **الشامية (Levantine)**: Syrian, Lebanese, Palestinian, Jordanian → Return in Levantine ONLY
- **المغربية (Moroccan/Darija)**: Moroccan dialect → Return in Moroccan ONLY
- **العراقية (Iraqi)**: Iraqi dialect → Return in Iraqi ONLY
- **السودانية (Sudanese)**: Sudanese dialect → Return in Sudanese ONLY

### English Variety Preservation:
- American English → American spellings & expressions
- British English → British spellings & expressions
- Australian English → Australian expressions

### ABSOLUTE PROHIBITION:
⚠️ **NEVER convert ANY dialect to Egyptian Arabic unless the source IS Egyptian**
⚠️ **NEVER mix dialects within the same text**
⚠️ **NEVER "upgrade" colloquial to Fusha or vice versa**

## CRITICAL RULE #2: SEMANTIC INTEGRITY (100% PRESERVATION)

### PRESERVE EXACTLY:
- ALL opinions (positive/negative) → Output same opinion
- ALL facts and data → Output same facts
- ALL arguments and reasoning → Output same logic
- ALL emotional tones → Output same emotion

### ABSOLUTELY PROHIBITED:
❌ Adding new opinions not in original
❌ Changing positive to negative or vice versa
❌ Adding filler/fluff content
❌ Removing key points
❌ Softening strong statements
❌ Changing facts or statistics

## CRITICAL RULE #3: HUMANIZATION TECHNIQUES

### Increase Burstiness (Sentence Length Variation):
- Mix very short sentences (3-5 words)
- With medium sentences (10-15 words)
- And longer sentences (20-30+ words)
- Create natural rhythm variation

### Add Human Markers (Dialect-Appropriate):
**English:**
- Contractions: "it's", "don't", "we're"
- Self-corrections: "I mean...", "actually...", "well..."
- Natural hesitations: "kind of", "sort of", "you know"
- Emotional expressions: excitement, frustration

**Arabic Fusha:**
- وبصراحة، حقيقة، أعني، بل إن
- Slight sentence structure variations

**Arabic Colloquial (Egyptian Example):**
- يعني، والله، بجد، أصلاً
- Natural colloquial flow

**Gulf Arabic:**
- يعني، والله، صدق، أدري، وايد

### Remove AI Patterns:
❌ "Furthermore", "Moreover", "In conclusion"
❌ "It is important to note", "It's worth mentioning"
❌ "بالإضافة إلى ذلك", "علاوة على ذلك", "في الختام"
❌ Perfect parallel structure
❌ Uniform paragraph lengths
❌ Generic transitional phrases

## INTENT-SPECIFIC STYLES:

### 1. DEFAULT:
Natural, balanced humanization with moderate changes.

### 2. ACADEMIC:
- Maintain scholarly vocabulary
- Keep citation-friendly structure
- Add subtle human touches without compromising academic tone
- Vary sentence flow while keeping formality

### 3. CASUAL:
- Very relaxed, conversational tone
- Use contractions freely
- Add informal expressions appropriate to dialect
- Feel like talking to a friend

### 4. BUSINESS:
- Professional but personable
- Action-oriented language
- Clear and direct
- Confident tone without being cold

### 5. CREATIVE:
- Vivid imagery and metaphors
- Artistic expression
- Emotional depth
- Unique phrasing

### 6. MARKETING:
- Engaging hooks
- Persuasive language
- Natural calls to action
- Create urgency without being pushy

### 7. UNDETECTABLE:
- MAXIMUM humanization effort
- Priority: passing ALL AI detectors
- Heavy burstiness variation
- Genuine imperfections
- Natural speech patterns at highest level
- Self-corrections and tangents
- Emotional authenticity

## OUTPUT RULES:
1. Return ONLY the humanized text
2. NO explanations or metadata
3. NO "Here is the humanized text:" prefix
4. Preserve EXACT dialect of input
5. Preserve exact meaning and sentiment`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, intent = 'default', language = 'en' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ 
        error: language === 'ar' ? "لم يتم توفير نص" : "No text provided" 
      }, { status: 400 });
    }

    const trimmedText = text.trim();
    if (trimmedText.length < 20) {
      return NextResponse.json({ 
        error: language === 'ar' ? "النص قصير جداً (الحد الأدنى 20 حرف)" : "Text is too short (minimum 20 characters)" 
      }, { status: 400 });
    }

    const processText = trimmedText.length > 12000 
      ? trimmedText.substring(0, 12000) 
      : trimmedText;

    // Detect language/dialect
    const isArabic = /[\u0600-\u06FF]/.test(processText);
    
    const intentInstructions: Record<string, string> = {
      default: "Apply standard humanization with natural variety. Moderate changes.",
      academic: "Maintain academic rigor and scholarly tone. Keep citations and formal structure. Add subtle human variation to sentence flow.",
      casual: "Make it very relaxed and conversational. Use contractions freely. Like talking to a friend. Informal but clear.",
      business: "Professional and personable. Action-oriented, direct, confident. Clear communication without being cold or robotic.",
      creative: "Add vivid imagery, metaphors, artistic flair. Emotional depth. Unique creative expression while keeping core message.",
      marketing: "Persuasive and engaging. Natural hooks and calls to action. Create urgency. Connect emotionally with reader.",
      undetectable: "MAXIMUM humanization. TOP PRIORITY: Pass all AI detectors. Heavy sentence variation. Genuine imperfections. Natural speech patterns. Self-corrections. Emotional authenticity. Make it TRULY sound human-written."
    };

    const fullPrompt = `${systemPrompt}

## SELECTED INTENT: ${intent.toUpperCase()}
${intentInstructions[intent] || intentInstructions.default}

${isArabic ? `## تذكير خاص باللغة العربية:
- اكتشف اللهجة بدقة (فصحى، مصرية، خليجية، شامية، مغربية، إلخ)
- ارجع النص بنفس اللهجة تماماً
- لا تحول أي لهجة للمصرية إلا إذا كان الأصل مصرياً
- حافظ على المعنى والرأي 100%` : ''}

---
TEXT TO HUMANIZE:
"""
${processText}
"""

Detect the exact language/dialect first, then humanize in that EXACT dialect.
Return ONLY the humanized text with no explanations:`;

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
                { text: fullPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.85,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
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
            error: language === 'ar' ? "تم تجاوز الحد، حاول بعد دقيقة" : "Rate limit exceeded, please try again in a minute"
          }, { status: 429 });
        }
        
        return NextResponse.json({ 
          error: language === 'ar' ? "فشل في معالجة النص" : "Failed to humanize text" 
        }, { status: 500 });
      }

      const humanizedText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!humanizedText) {
        return NextResponse.json({ 
          error: language === 'ar' ? "لم يتم استلام استجابة" : "No response received" 
        }, { status: 500 });
      }

      // Clean any unwanted prefixes
      let cleanText = humanizedText.trim();
      const unwantedPrefixes = [
        "Here is the humanized text:",
        "Here's the humanized text:",
        "Humanized text:",
        "إليك النص المُحسَّن:",
        "النص بعد التحسين:",
      ];
      
      for (const prefix of unwantedPrefixes) {
        if (cleanText.toLowerCase().startsWith(prefix.toLowerCase())) {
          cleanText = cleanText.substring(prefix.length).trim();
        }
      }

      return NextResponse.json({ humanizedText: cleanText });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          error: language === 'ar' ? "انتهت المهلة، جرب نص أقصر" : "Request timed out, please try a shorter text"
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
export const maxDuration = 90;
