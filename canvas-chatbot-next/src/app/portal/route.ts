import { CustomerPortal } from "@polar-sh/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { createOrRetrieveCustomer } from '@/lib/supabase/admin';
import { getAppUrl } from '@/lib/utils/get-app-url';

const portalHandler = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? '',
  returnUrl: process.env.POLAR_RETURN_URL || getAppUrl('/account/billing'),
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "production",
  getCustomerId: async (req: NextRequest) => {
    try {
      console.log('[Portal] Starting getCustomerId');
      
      if (!process.env.POLAR_ACCESS_TOKEN) {
        console.error('[Portal] POLAR_ACCESS_TOKEN is missing');
        throw new Error('POLAR_ACCESS_TOKEN is not configured');
      }

      console.log('[Portal] Creating Supabase client');
      const supabase = await createClient();
      
      console.log('[Portal] Getting user');
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('[Portal] Auth error:', authError.message);
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      if (!user) {
        console.error('[Portal] No user found');
        throw new Error('User not found');
      }

      console.log('[Portal] User found:', user.id, user.email);
      console.log('[Portal] Creating/retrieving customer');
      
      const customerId = await createOrRetrieveCustomer({
        email: user.email ?? '',
        uuid: user.id
      });

      console.log('[Portal] Customer ID:', customerId);
      return customerId;
    } catch (error) {
      console.error('[Portal] Error in getCustomerId:', error);
      if (error instanceof Error) {
        console.error('[Portal] Error stack:', error.stack);
      }
      throw error;
    }
  }
});

export async function GET(req: NextRequest) {
  try {
    console.log('[Portal] GET request received');
    return await portalHandler(req);
  } catch (error) {
    console.error('[Portal] Handler error:', error);
    if (error instanceof Error) {
      console.error('[Portal] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { 
        error: 'Failed to open customer portal',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

