import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { verifyToken } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

/**
 * GET /api/signatures/confirm?token=<jwt>
 * Atomically confirms a signature using the Supabase RPC function.
 * Single-use enforcement via nonce check in the database.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing confirmation token' },
        { status: 400 }
      );
    }

    // Verify token signature and expiry
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired confirmation link' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Call the atomic RPC function
    // This handles:
    // 1. Single-use check via nonce
    // 2. Signature confirmation
    // 3. Petition signature_count increment
    // All in a single atomic transaction
    const { data, error } = await supabase.rpc('confirm_signature', {
      p_signature_id: payload.signatureId,
    });

    if (error) {
      console.error('RPC confirmation error:', error);
      
      // Check for specific race condition errors
      if (error.message?.includes('not_found') || error.message?.includes('race_condition')) {
        return NextResponse.json(
          { error: 'This confirmation link has already been used or is invalid' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to confirm signature' },
        { status: 500 }
      );
    }

    // data contains { success: boolean, reason?: string, petition_id?: uuid }
    if (data && data.success) {
      // Redirect to the petition page
      const petitionId = data.petition_id || payload.petitionId;
      return NextResponse.redirect(
        new URL(`/petitions/${petitionId}?confirmed=true`, req.url)
      );
    } else {
      // Race condition or already confirmed
      return NextResponse.json(
        { error: data?.reason || 'Signature already confirmed or invalid' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected confirmation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
