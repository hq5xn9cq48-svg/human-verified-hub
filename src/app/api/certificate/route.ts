import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { verificationId, score, content, userId } = body;

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
        id: certificateId,
        verification_id: verificationId,
        user_id: userId || null,
        score: score,
        content_preview: content?.substring(0, 200) || '',
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
      .eq('id', certificateId)
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
        id: data.id,
        score: data.score,
        issuedAt: data.issued_at,
        contentPreview: data.content_preview
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
