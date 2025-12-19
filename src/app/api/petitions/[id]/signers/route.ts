import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/petitions/[id]/signers
 * Returns partial signer list (first name + verified status only) for petition authors.
 * Enforces RLS: Only returns data if the authenticated user owns the petition.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Call the secure RPC function
    // This will return data only if the user owns the petition
    const { data, error } = await supabase.rpc('get_petition_signers', {
      p_petition_id: params.id,
    });

    if (error) {
      console.error('RPC error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch signers' },
        { status: 500 }
      );
    }

    // data will be null or empty if user doesn't own the petition (RLS enforcement)
    return NextResponse.json({
      signers: data || [],
      total_count: data?.length || 0,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
