import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAuthenticatedClient } from '@/utils/supabase/server';

/**
 * Update trip visibility (is_public)
 * Only the trip owner can change this setting
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { is_public } = body;

    if (typeof is_public !== 'boolean') {
      return NextResponse.json({ error: 'is_public must be a boolean' }, { status: 400 });
    }

    const supabase = await createAuthenticatedClient();

    const { data, error } = await supabase
      .from('trips')
      .update({ is_public, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating trip visibility:', error);
      return NextResponse.json({ error: 'Failed to update trip visibility' }, { status: 500 });
    }

    return NextResponse.json({ success: true, trip: data });
  } catch (error) {
    console.error('API Error in PATCH /api/trips/[id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
