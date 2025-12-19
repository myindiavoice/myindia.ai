import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/petitions/[id]/signers?limit=50&offset=0
 * Returns partial signer list (first name + verified status only) for petition authors.
 * Enforces RLS: Only returns data if the authenticated user owns the petition.
 * Supports pagination via limit and offset query parameters.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Use createRouteHandlerClient for authenticated requests (anon key + user JWT)
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Call the secure RPC functions
    // These enforce authorization: only return data if user owns the petition
    const [signersResult, countResult] = await Promise.all([
      supabase.rpc('get_petition_signers', {
        p_petition_id: params.id,
        p_limit: limit,
        p_offset: offset,
      }),
      supabase.rpc('get_petition_signer_count', {
        p_petition_id: params.id,
      }),
    ]);

    if (signersResult.error) {
      console.error('RPC get_petition_signers error:', signersResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch signers' },
        { status: 500 }
      );
    }

    if (countResult.error) {
      console.error('RPC get_petition_signer_count error:', countResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch signer count' },
        { status: 500 }
      );
    }

    // If data is null/empty, user doesn't own the petition (RLS enforcement)
    return NextResponse.json({
      signers: signersResult.data || [],
      total: countResult.data || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
