import { NextResponse } from "next/server";
import * as cheerio from 'cheerio';

const GEMINI_API_KEY = "AIzaSyA5J7uUUwGJZuqFQiLae8XsQe4lJZ4U8Oc";

// SENTINEL-AI V5.0 - Ultra-Strict Anti-Trickery System
const systemPrompt = `# SENTINEL-AI V5.0 - ULTRA SKEPTICAL FORENSIC ANALYZER

## CORE OPERATING PRINCIPLE:
You are an EXTREMELY SKEPTICAL forensic linguistic analyst. Your default assumption is that ALL text is AI-generated until PROVEN otherwise with OVERWHELMING human evidence.

## ANTI-TRICKERY PROTOCOL (CRITICAL):

### Why This Matters:
- 90%+ of text online is now AI-generated or AI-assisted
- AI systems are designed to fool detection
- "Personal" additions can be fabricated by AI
- "Imperfections" can be artificially added
- Your job is to ASSUME AI until proven human

### Starting Point:
⚠️ **BASE SCORE: 15** (Highly Suspicious)
- Start with assumption text is AI
- ONLY add points for GENUINE human evidence
- DEDUCT heavily for AI patterns

## DETECTION SIGNATURES:

### STRUCTURAL PATTERNS (Heavy Penalties):

**Transitional Clichés (-15 each):**
English:
- "Furthermore", "Moreover", "In conclusion"
- "It's worth noting", "Additionally"
- "On the other hand", "That being said"
- "In essence", "To summarize"

Arabic:
- "بالإضافة إلى ذلك", "علاوة على ذلك"
- "في الختام", "من الجدير بالذكر"
- "من ناحية أخرى", "وفي النهاية"
- "وبالتالي", "ومن ثم"

**Structural Issues (-10 to -20 each):**
- Perfect bullet point lists → -10
- Uniform paragraph lengths (±10 words) → -20
- S-V-O sentence pattern repetition → -15
- Opening with definitions → -10
- Closing with neat summary → -10
- Perfect logical flow → -10
- Three-point structure everywhere → -15

### LINGUISTIC PATTERNS (Penalties):

**Hedging Language (-10 each):**
- "It is important to note that..."
- "One might argue that..."
- "It could be said that..."
- "This suggests that..."
- "من المهم الإشارة إلى..."
- "يمكن القول بأن..."

**Generic Praise Words (-5 each):**
- "fascinating", "remarkable", "significant"
- "رائع", "مذهل", "مهم جداً"

**AI Style Markers (-10 to -15):**
- Neutral/balanced tone throughout → -15
- No contractions in casual English → -10
- Perfect punctuation → -10
- No colloquialisms or slang → -15
- Overly formal vocabulary → -10

### CONTENT PATTERNS (Heavy Penalties):

**Missing Human Elements (-15 to -25 each):**
- No personal pronouns (I, my, we) → -20
- No specific personal anecdotes → -25
- No emotional inconsistency → -15
- No genuine opinion without hedging → -15
- No minor errors or imperfections → -20

**AI Content Signatures (-10 to -20 each):**
- Comprehensive coverage of topic → -15
- Too organized structure → -10
- All counterarguments addressed → -15
- Perfect balance of perspectives → -15
- Encyclopedic completeness → -15

## HUMAN INDICATORS (STRICT REQUIREMENTS):

### Points ONLY for GENUINE Evidence:

**Authentic Personal Content (+15 to +30):**
- SPECIFIC personal anecdote with unique details → +30
- Named people, places, dates → +20
- Emotional expressions (frustration, excitement) → +20
- Cultural references with personal connection → +15

**Writing Imperfections (+10 to +20):**
- GENUINE typos (not fake/deliberate) → +20
- Run-on sentences → +15
- Sentence fragments → +15
- Self-corrections ("I mean...", "actually...") → +15
- Incomplete thoughts or tangents → +15
- Inconsistent formatting → +10

**Natural Speech Patterns (+10 to +20):**
- Heavy sentence length variation → +20
- Colloquial expressions natural to context → +15
- Contractions in appropriate places → +10
- Opinion stated WITHOUT hedging → +15

## ANTI-TRICKERY MEASURES (CRITICAL):

### Fake Human Markers = STILL AI:
⚠️ If "errors" look deliberate → -10 (worse than no errors)
⚠️ If "personal" story is generic → -15
⚠️ If "emotion" feels forced → -10
⚠️ If text TRIES to seem human → -20
⚠️ Inconsistent style suggests editing → -15

### Red Flags for Faked Humanity:
- Errors only in easy-to-fix places
- "Personal" stories without specific details
- Emotional language that doesn't match content
- Sudden informal language in formal text
- Perfect grammar + one obvious typo = suspicious

## SCORING SCALE:

0-20: **AI Generated** (Default category for most text)
21-40: **Likely AI** (Minor human touches but clearly AI base)
41-60: **Uncertain/Hybrid** (Could be AI-edited or human with AI tools)
61-80: **Possibly Human** (Significant human evidence)
81-100: **Human Written** (RARE - requires overwhelming evidence)

## HEATMAP ANALYSIS:

For EACH sentence:
- Score 0-30: "ai" classification
- Score 31-60: "mixed" classification  
- Score 61-100: "human" classification

## OUTPUT FORMAT (JSON ONLY):
{
  "analysisMetadata": {
    "wordCount": number,
    "sentenceCount": number,
    "perplexityLevel": "very low|low|medium|high|very high",
    "burstinessScore": "monotonous|low|medium|varied|explosive",
    "sentenceLengthVariance": "uniform|low|medium|high"
  },
  "humanScore": number (0-100),
  "verdict": "AI Generated" | "Likely AI" | "Uncertain" | "Possibly Human" | "Human Written",
  "confidence": "very high|high|medium|low",
  "summary": "Detailed forensic summary with evidence",
  "aiIndicators": [
    {"pattern": "Name", "penalty": number, "description": "Specific evidence from text"}
  ],
  "humanIndicators": [
    {"pattern": "Name", "bonus": number, "description": "Specific evidence from text"}
  ],
  "forensicDetails": {
    "syntaxAnalysis": "Syntax pattern breakdown",
    "lexicalRichness": "Vocabulary assessment",
    "predictability": "Text flow predictability"
  },
  "heatmap": [
    {"sentence": "Exact sentence", "score": number, "classification": "ai|mixed|human", "reason": "Brief reason"}
  ]
}

## CRITICAL RULES:
1. Output ONLY valid JSON
2. DEFAULT to AI classification unless strong evidence
3. Be HARSH - assume the worst
4. Look for GENUINE human markers, not fake ones
5. Short texts (<50 words) = automatic uncertainty
6. Include ALL sentences in heatmap
7. "Perfect" writing = AI writing`;

// Arabic supplement
const arabicPromptAddition = `
## تذكير باللغة العربية:
- افترض أن النص ذكاء اصطناعي حتى يثبت العكس بأدلة قوية
- النص الخالي من الأخطاء = مشبوه
- النص بدون تجارب شخصية حقيقية = AI
- العبارات الانتقالية المثالية = AI
- التنظيم المثالي = AI
- أي محاولة لإظهار "بشرية" مصطنعة = AI
`;

async function scrapeUrl(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,ar;q=0.3',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, noscript, svg, img, video, audio, form, button, input, select, textarea, [role="navigation"], [role="banner"], [role="complementary"], .advertisement, .ad, .ads, .sidebar, .comment, .comments, .social, .share, .related').remove();

    const title = $('title').text().trim() || 
                  $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  'Untitled';

    let content = '';
    const contentSelectors = [
      'article', 'main', '[role="main"]', '.post-content', '.article-content',
      '.entry-content', '.content', '.post', '.article', '#content', '#main',
      '.story-body', '.article-body',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length) {
        content = element.text();
        break;
      }
    }

    if (!content) {
      content = $('body').text();
    }

    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    if (content.length > 15000) {
      content = content.substring(0, 15000) + '...';
    }

    return content.length >= 50 ? { title, content } : null;
  } catch (error) {
    console.error('Scrape error:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { text, url, language = 'en' } = body;

    // If URL is provided, scrape content
    if (url && typeof url === 'string') {
      try {
        new URL(url);
        const scraped = await scrapeUrl(url);
        if (scraped) {
          text = scraped.content;
        } else {
          return NextResponse.json({ 
            error: language === 'ar' ? "فشل في استخراج المحتوى من الرابط" : "Failed to extract content from URL" 
          }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ 
          error: language === 'ar' ? "رابط غير صالح" : "Invalid URL format" 
        }, { status: 400 });
      }
    }

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

    // Detect if text is Arabic
    const isArabic = /[\u0600-\u06FF]/.test(analysisText);
    
    const fullPrompt = `${systemPrompt}
${isArabic ? arabicPromptAddition : ''}

---
TEXT TO ANALYZE:
"""
${analysisText}
"""

Perform ULTRA-THOROUGH forensic analysis. Default assumption: THIS IS AI TEXT.
Look for GENUINE human evidence to change this assumption.
Include sentence-by-sentence heatmap. Return JSON only:`;

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
            temperature: 0.02,
            topP: 0.75,
            topK: 5,
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

      // Validate and normalize score
      if (typeof jsonData.humanScore === 'string') {
        jsonData.humanScore = parseInt(jsonData.humanScore, 10) || 15;
      }
      jsonData.humanScore = Math.max(0, Math.min(100, jsonData.humanScore ?? 15));

      // Set verdict based on score
      if (!jsonData.verdict) {
        if (jsonData.humanScore <= 20) {
          jsonData.verdict = language === 'ar' ? "ذكاء اصطناعي" : "AI Generated";
        } else if (jsonData.humanScore <= 40) {
          jsonData.verdict = language === 'ar' ? "غالباً AI" : "Likely AI";
        } else if (jsonData.humanScore <= 60) {
          jsonData.verdict = language === 'ar' ? "غير مؤكد" : "Uncertain";
        } else if (jsonData.humanScore <= 80) {
          jsonData.verdict = language === 'ar' ? "محتمل بشري" : "Possibly Human";
        } else {
          jsonData.verdict = language === 'ar' ? "بشري مؤكد" : "Human Written";
        }
      }

      // Ensure arrays exist
      jsonData.aiIndicators = Array.isArray(jsonData.aiIndicators) ? jsonData.aiIndicators : [];
      jsonData.humanIndicators = Array.isArray(jsonData.humanIndicators) ? jsonData.humanIndicators : [];
      jsonData.heatmap = Array.isArray(jsonData.heatmap) ? jsonData.heatmap : [];

      // Validate heatmap items
      jsonData.heatmap = jsonData.heatmap.map((item: any) => ({
        sentence: item.sentence || '',
        score: Math.max(0, Math.min(100, parseInt(item.score, 10) || 30)),
        classification: ['ai', 'mixed', 'human'].includes(item.classification) ? item.classification : 'ai',
        reason: item.reason || ''
      }));

      // Ensure metadata exists
      if (!jsonData.analysisMetadata) {
        const sentences = analysisText.split(/[.!?؟。]+/).filter(s => s.trim().length > 0);
        jsonData.analysisMetadata = {
          wordCount: analysisText.split(/\s+/).length,
          sentenceCount: sentences.length,
          perplexityLevel: "medium",
          burstinessScore: "varied",
          sentenceLengthVariance: "medium"
        };
      }

      // Ensure forensic details exist
      if (!jsonData.forensicDetails) {
        jsonData.forensicDetails = {
          syntaxAnalysis: "N/A",
          lexicalRichness: "N/A",
          predictability: "N/A"
        };
      }

      jsonData.confidence = jsonData.confidence || jsonData.confidenceLevel || "medium";

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
export const maxDuration = 90;
