import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Call the RPC function that counts from auth.users
    const { data: count, error } = await supabase
      .rpc('get_total_user_count');

    if (error) {
      console.error('Error fetching user count:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user count' },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: count || 0 }, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error in user count API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user count' },
      { status: 500 }
    );
  }
}
