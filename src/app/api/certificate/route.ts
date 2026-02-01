import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { isUserPro } from '@/lib/freemium';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Extract user from authorization header
async function getUserFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || !supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user.id;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // STRICT GATING: Certificate generation is Pro-only feature
    const userId = await getUserFromRequest(req);
    
    if (!userId) {
      return NextResponse.json({
        error: 'Please sign in to generate certificates.',
        errorCode: 'AUTH_REQUIRED'
      }, { status: 401 });
    }
    
    // Check if user is Pro
    const isPro = await isUserPro(userId);
    
    if (!isPro) {
      return NextResponse.json({
        error: 'PDF Certificate Generation is a Pro feature. Upgrade to Pro to unlock this feature.',
        errorCode: 'PRO_REQUIRED',
        upgradeUrl: '/pricing'
      }, { status: 403 });
    }
    
    const body = await req.json();
    const { verificationId, humanScore, content } = body;
    
    // Support both 'humanScore' and 'score' for backwards compatibility
    const score = humanScore ?? body.score;

    if (!verificationId || score === undefined) {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    // Only issue certificates for scores above 90
    if (score < 90) {
      return NextResponse.json({ 
        error: "Certificate only available for Human scores above 90%" 
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate certificate ID
    const certificateId = `HVC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Store certificate in database
    const { error: insertError } = await supabase
      .from('certificates')
      .insert({
        certificate_id: certificateId,
        verification_id: verificationId,
        user_id: userId || null,
        human_score: score,
        content_excerpt: content?.substring(0, 200) || '',
        issued_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Certificate insert error:', insertError);
      // Continue even if insert fails - the certificate can still be generated
    }

    return NextResponse.json({ 
      certificateId,
      score,
      issuedAt: new Date().toISOString(),
      verifyUrl: `/verify/${certificateId}`
    });

  } catch (error: any) {
    console.error("Certificate Error:", error?.message || error);
    return NextResponse.json({ 
      error: "Failed to generate certificate" 
    }, { status: 500 });
  }
}

// GET endpoint to verify certificate
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const certificateId = url.searchParams.get('id');

    if (!certificateId) {
      return NextResponse.json({ 
        error: "Certificate ID required" 
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('certificate_id', certificateId)
      .single();

    if (error || !data) {
      return NextResponse.json({ 
        error: "Certificate not found",
        valid: false
      }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      certificate: {
        id: data.certificate_id,
        score: data.human_score,
        issuedAt: data.issued_at,
        contentPreview: data.content_excerpt
      }
    });

  } catch (error: any) {
    console.error("Verify Error:", error?.message || error);
    return NextResponse.json({ 
      error: "Failed to verify certificate",
      valid: false
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
