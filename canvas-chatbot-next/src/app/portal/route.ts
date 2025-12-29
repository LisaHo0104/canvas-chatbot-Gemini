import { CustomerPortal } from "@polar-sh/nextjs";
import { NextRequest } from "next/server";
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { createOrRetrieveCustomer } from '@/lib/supabase/admin';
import { getAppUrl } from '@/lib/utils/get-app-url';

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  returnUrl: process.env.POLAR_RETURN_URL || getAppUrl('/account/billing'),
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "production",
  getCustomerId: async (req: NextRequest) => {
    // Get authenticated user using route handler client (properly handles cookies from request)
    const supabase = createRouteHandlerClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Get or create customer using admin utility (queries customers table)
    try {
      const customerId = await createOrRetrieveCustomer({
        uuid: user.id,
        email: user.email || ''
      });
      return customerId;
    } catch (error) {
      console.error('Failed to get or create customer:', error);
      // Fallback: return user ID as external_id (Polar will resolve it)
      return user.id;
    }
  },
});

