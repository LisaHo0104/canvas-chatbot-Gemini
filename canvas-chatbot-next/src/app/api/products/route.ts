import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/supabase/queries';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Debug: Log the schema being used
    const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';
    console.log('[API Products] Using schema:', schema);
    
    const products = await getProducts(supabase);

    if (!products) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

