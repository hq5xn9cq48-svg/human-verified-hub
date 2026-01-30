import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { checkAndIncrementUsage, extractClientIP, UsageStatus, isFeatureAllowed, getFeatureLockedResponse } from '@/lib/freemium';

// API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Supabase client for auth verification
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Step-by-step logging utility
function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [FILE-ANALYZE] ${step}`, details ? JSON.stringify(details, null, 2) : '');
}

function logError(step: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [FILE-ANALYZE ERROR] ${step}:`, error);
}

const systemPrompt = `You are SENTINEL-AI V6.0, an expert forensic linguistic analyzer with PhD-level expertise in computational linguistics, stylometry, and AI detection.

## MISSION CRITICAL
Analyze text with FORENSIC SENSITIVITY to determine if it was written by a human or AI. You must be EXTREMELY STRICT and evidence-based. Do NOT hallucinate - only report patterns you actually detect.

## FORENSIC ANALYSIS FRAMEWORK

### BURSTINESS ANALYSIS (Human signature)
- Humans write with HIGH burstiness: sentence lengths vary dramatically (5 words, then 25, then 12)
- AI writes with LOW burstiness: sentences cluster around similar lengths (15-20 words consistently)
- Calculate variance in sentence lengths - high variance = more human

### PERPLEXITY ANALYSIS (Predictability)
- AI text has LOW perplexity: predictable word choices, common collocations
- Human text has HIGH perplexity: unexpected word combinations, creative choices
- Look for: unique metaphors, unusual adjectives, non-standard phrasing

### SYNTHETIC ARTIFACTS (AI fingerprints)
- Repetitive sentence starters ("This", "The", "It")
- Perfect parallel structure across paragraphs
- Transitional phrase overuse: "Furthermore", "Moreover", "Additionally", "In conclusion"
- Hedging language: "It's important to note", "It's worth mentioning"
- Generic superlatives: "very important", "extremely crucial"
- Numbered lists with perfect formatting
- Lack of contractions (cannot vs can't)

### HUMAN AUTHENTICITY MARKERS
- Personal pronouns with context (I remember, we decided)
- Specific details (dates, names, places)
- Emotional language with genuine context
- Conversational asides and parentheticals
- Minor grammatical imperfections
- Idiosyncratic word choices
- Run-on thoughts and tangents
- Cultural references and humor

## SCORING (0-100 scale) - BE STRICT
- 0-20: DEFINITELY AI (multiple clear AI patterns, synthetic feel)
- 21-40: LIKELY AI (significant AI indicators, low burstiness)
- 41-60: UNCERTAIN (mixed signals, needs more context)
- 61-80: LIKELY HUMAN (natural flow, some human markers)
- 81-100: DEFINITELY HUMAN (strong authenticity, high burstiness)

## OUTPUT FORMAT (JSON ONLY)
{
  "humanScore": number (0-100),
  "verdict": "AI Generated" | "Likely AI" | "Uncertain" | "Likely Human" | "Human Written",
  "confidence": "high" | "medium" | "low",
  "summary": "2-3 sentence forensic summary with specific evidence",
  "analysisMetadata": {
    "wordCount": number,
    "sentenceCount": number,
    "perplexityLevel": "low" | "medium" | "high",
    "burstinessScore": "low" | "medium" | "high"
  },
  "aiIndicators": [{"pattern": "name", "description": "specific evidence from text", "penalty": 1-15}],
  "humanIndicators": [{"pattern": "name", "description": "specific evidence from text", "bonus": 1-15}],
  "forensicDetails": {
    "syntaxAnalysis": "Sentence structure variance analysis",
    "lexicalRichness": "Vocabulary diversity and uniqueness",
    "predictability": "Word choice predictability assessment"
  },
  "smartBreakdown": ["Specific finding 1 with quoted evidence", "Finding 2", "Finding 3", "Finding 4"]
}

## CRITICAL RULES
1. NEVER hallucinate - only cite patterns you actually detect in the text
2. Include 4-5 specific findings in smartBreakdown with quoted evidence where possible
3. Be STRICT - modern AI is sophisticated, don't be fooled by surface-level human imitation
4. Calculate actual burstiness by measuring sentence length variance
5. Return ONLY valid JSON, no markdown, no explanations outside JSON

Return ONLY valid JSON, no markdown, no code blocks, no additional text.`;

// Extract user from authorization header
async function getUserFromRequest(req: Request): Promise<{ userId: string | null; isPro: boolean }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { userId: null, isPro: false };
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { userId: null, isPro: false };
    }
    
    return { userId: user.id, isPro: false };
  } catch {
    return { userId: null, isPro: false };
  }
}

// Extract text from PDF using a simple text extraction approach
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // Convert buffer to text by finding text patterns
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  
  // Basic PDF text extraction - look for text between stream/endstream or BT/ET markers
  // This is a simplified approach; for production, use a proper PDF library
  const textMatches: string[] = [];
  
  // Extract text from PDF objects
  const regex = /\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const extracted = match[1];
    // Filter out PDF commands and keep only readable text
    if (extracted.length > 2 && !/^[\\\/\[\]{}%]/.test(extracted)) {
      textMatches.push(extracted);
    }
  }
  
  // Also try to extract text from text objects
  const textBlocks = text.match(/BT[\s\S]*?ET/g) || [];
  for (const block of textBlocks) {
    const textParts = block.match(/\(([^)]+)\)/g) || [];
    for (const part of textParts) {
      const clean = part.slice(1, -1);
      if (clean.length > 2) {
        textMatches.push(clean);
      }
    }
  }
  
  const result = textMatches.join(' ').replace(/\s+/g, ' ').trim();
  
  // If basic extraction fails, try a more aggressive approach
  if (result.length < 100) {
    // Look for any readable ASCII text sequences
    const asciiText = text
      .replace(/[\x00-\x1f\x7f-\xff]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Filter out obvious PDF metadata
    const cleanText = asciiText
      .replace(/\/\w+/g, ' ')
      .replace(/<<[^>]*>>/g, ' ')
      .replace(/\d+\s+\d+\s+obj/g, ' ')
      .replace(/endobj/g, ' ')
      .replace(/stream/g, ' ')
      .replace(/endstream/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleanText.length > result.length ? cleanText : result;
  }
  
  return result;
}

// Extract text from Word document (docx)
async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  // DOCX is a ZIP file containing XML
  // For a basic implementation, we'll extract readable text
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  
  // Extract text from XML-like content
  const textMatches: string[] = [];
  
  // Look for text content in XML tags
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1].trim()) {
      textMatches.push(match[1]);
    }
  }
  
  // Also try generic XML text extraction
  const xmlTextRegex = />([^<>]{3,})</g;
  while ((match = xmlTextRegex.exec(text)) !== null) {
    const extracted = match[1].trim();
    if (extracted.length > 10 && !/^[\d\s\-\/\.]+$/.test(extracted)) {
      textMatches.push(extracted);
    }
  }
  
  const result = textMatches.join(' ').replace(/\s+/g, ' ').trim();
  return result;
}

// Call Gemini API
async function callGeminiAPI(text: string, language: string): Promise<any> {
  const langInstruction = language === 'ar' 
    ? "IMPORTANT: You MUST output ALL text content in Arabic language."
    : "Output the analysis in English.";

  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-flash-latest',
  ];

  for (const model of models) {
    try {
      logStep(`Trying model`, { model });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `${systemPrompt}\n\n${langInstruction}\n\nAnalyze this text:\n"""${text}"""` 
              }] 
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
              topP: 0.8,
              topK: 40,
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
        continue;
      }

      const data = await response.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (responseText) {
        // Parse JSON response
        const cleaned = responseText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/gi, '')
          .trim();
        
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      logError(`Model ${model} failed`, error);
      continue;
    }
  }

  return null;
}

export async function POST(req: Request) {
  logStep('=== NEW FILE ANALYSIS REQUEST ===');
  
  // Check API key
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    // Check user authentication
    const { userId } = await getUserFromRequest(req);
    
    if (!userId) {
      return NextResponse.json({
        error: 'File upload analysis requires authentication and Pro subscription.',
        errorCode: 'AUTH_REQUIRED',
        requiresUpgrade: true
      }, { status: 401 });
    }

    // Check if user is Pro - this is a Pro-only feature
    let usageStatus: UsageStatus | null = await checkAndIncrementUsage(userId, 'text-analysis');
    
    // File upload is Pro-only
    if (!usageStatus.isPro) {
      return NextResponse.json({
        error: 'File upload analysis is only available for Pro subscribers. Upgrade to get full access.',
        errorCode: 'FEATURE_LOCKED',
        requiresUpgrade: true
      }, { status: 403 });
    }

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const language = (formData.get('language') as string) || 'en';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    logStep('File received', { 
      name: file.name, 
      size: file.size, 
      type: file.type 
    });

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        error: language === 'ar' ? 'الملف كبير جداً (الحد الأقصى 10 ميجابايت)' : 'File too large (max 10MB)'
      }, { status: 400 });
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf') || file.type === 'application/pdf';
    const isWord = fileName.endsWith('.docx') || fileName.endsWith('.doc') || 
                   file.type.includes('word') || file.type.includes('document');
    const isText = fileName.endsWith('.txt') || file.type === 'text/plain';

    if (!isPDF && !isWord && !isText) {
      return NextResponse.json({
        error: language === 'ar' 
          ? 'نوع الملف غير مدعوم. يرجى رفع ملف PDF أو Word أو نص عادي.'
          : 'Unsupported file type. Please upload a PDF, Word, or plain text file.'
      }, { status: 400 });
    }

    // Read file content
    const buffer = await file.arrayBuffer();
    let extractedText = '';

    if (isText) {
      extractedText = new TextDecoder('utf-8').decode(buffer);
    } else if (isPDF) {
      extractedText = await extractTextFromPDF(buffer);
    } else if (isWord) {
      extractedText = await extractTextFromDocx(buffer);
    }

    logStep('Text extracted', { length: extractedText.length });

    // Check if we got enough text
    if (extractedText.length < 50) {
      return NextResponse.json({
        error: language === 'ar'
          ? 'لم نتمكن من استخراج نص كافٍ من الملف. يرجى التأكد من أن الملف يحتوي على نص قابل للقراءة.'
          : 'Could not extract enough text from the file. Please ensure the file contains readable text.'
      }, { status: 400 });
    }

    // Limit text length
    const analysisText = extractedText.substring(0, 8000);

    // Call Gemini API
    const result = await callGeminiAPI(analysisText, language);

    if (!result) {
      return NextResponse.json({
        error: language === 'ar' ? 'فشل التحليل. حاول مرة أخرى.' : 'Analysis failed. Please try again.'
      }, { status: 500 });
    }

    // Normalize result
    const normalizedResult = {
      ...result,
      humanScore: Math.max(0, Math.min(100, Number(result.humanScore) || 50)),
      confidence: result.confidence || 'medium',
      fileInfo: {
        name: file.name,
        size: file.size,
        type: isPDF ? 'PDF' : isWord ? 'Word' : 'Text',
        extractedLength: extractedText.length
      }
    };

    logStep('Analysis complete', { humanScore: normalizedResult.humanScore });

    return NextResponse.json(normalizedResult);

  } catch (error: any) {
    logError('Unhandled error', error);
    return NextResponse.json({ 
      error: `Analysis failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
